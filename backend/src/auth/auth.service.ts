import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChallengePurpose, CreditEntryType, OAuthProvider, Prisma } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { createHash, randomInt, randomUUID } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { AppEnv } from '../config/env';
import { CreditsService } from '../credits/credits.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto, LoginDto, ResetPasswordDto, SignupDto } from './auth.dto';

type ClientMeta = { ip?: string; userAgent?: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppEnv, true>,
    private readonly mail: MailService,
    private readonly credits: CreditsService,
  ) {}

  normalizeEmail(email: string) { return email.trim().toLowerCase(); }
  private hashCode(code: string) { return createHash('sha256').update(code).digest('hex'); }
  private async createChallenge(userId: string, email: string, purpose: ChallengePurpose) {
    const recent = await this.prisma.verificationChallenge.findFirst({ where: { userId, purpose }, orderBy: { createdAt: 'desc' } });
    if (recent && Date.now() - recent.createdAt.getTime() < 60_000) throw new BadRequestException('Wait one minute before requesting another code');
    const code = randomInt(100000, 1_000_000).toString();
    await this.prisma.verificationChallenge.create({ data: { userId, purpose, codeHash: this.hashCode(code), expiresAt: new Date(Date.now() + 10 * 60_000) } });
    await this.mail.sendCode(email, code, purpose === ChallengePurpose.VERIFY_EMAIL ? 'verify' : 'reset');
  }

  async signup(dto: SignupDto) {
    if (dto.password !== dto.confirmPassword) throw new BadRequestException('Passwords do not match');
    const email = this.normalizeEmail(dto.email);
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('An account with this email already exists');
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const user = await this.prisma.user.create({ data: { email, firstName: dto.firstName.trim(), lastName: dto.lastName.trim(), password: { create: { passwordHash } } } });
    await this.createChallenge(user.id, email, ChallengePurpose.VERIFY_EMAIL);
    return { message: 'Account created. Check your email for the verification code.', email };
  }

  async resendVerification(emailInput: string) {
    const user = await this.prisma.user.findUnique({ where: { email: this.normalizeEmail(emailInput) } });
    if (!user || user.emailVerifiedAt) return { message: 'If verification is required, a code has been sent.' };
    await this.createChallenge(user.id, user.email, ChallengePurpose.VERIFY_EMAIL);
    return { message: 'Verification code sent.' };
  }

  private async consumeChallenge(emailInput: string, code: string, purpose: ChallengePurpose) {
    const user = await this.prisma.user.findUnique({ where: { email: this.normalizeEmail(emailInput) } });
    if (!user) throw new BadRequestException('Invalid or expired code');
    const challenge = await this.prisma.verificationChallenge.findFirst({ where: { userId: user.id, purpose, consumedAt: null }, orderBy: { createdAt: 'desc' } });
    if (!challenge || challenge.expiresAt < new Date() || challenge.attempts >= 5) throw new BadRequestException('Invalid or expired code');
    if (challenge.codeHash !== this.hashCode(code)) {
      await this.prisma.verificationChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      throw new BadRequestException('Invalid or expired code');
    }
    await this.prisma.verificationChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
    return user;
  }

  async verifyEmail(email: string, code: string, meta: ClientMeta) {
    const user = await this.consumeChallenge(email, code, ChallengePurpose.VERIFY_EMAIL);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: user.emailVerifiedAt ?? new Date() } });
      const granted = await tx.creditLedgerEntry.findFirst({ where: { userId: user.id, type: CreditEntryType.TRIAL_GRANT } });
      if (!granted) await this.credits.grantWithClient(tx, user.id, new Prisma.Decimal(100), 'trial', CreditEntryType.TRIAL_GRANT);
    });
    return this.issueTokens(user.id, meta);
  }

  async login(dto: LoginDto, meta: ClientMeta) {
    const user = await this.prisma.user.findUnique({ where: { email: this.normalizeEmail(dto.email) }, include: { password: true } });
    if (!user?.password || !(await argon2.verify(user.password.passwordHash, dto.password))) throw new UnauthorizedException('Invalid email or password');
    if (!user.emailVerifiedAt) throw new UnauthorizedException('Verify your email before logging in');
    return this.issueTokens(user.id, meta);
  }

  private async issueTokens(userId: string, meta: ClientMeta, familyId: string = randomUUID()) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role }, { secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }), expiresIn: this.config.get('JWT_ACCESS_TTL', { infer: true }) as never });
    const sessionId = randomUUID();
    const refreshToken = await this.jwt.signAsync({ sub: user.id, sid: sessionId, familyId, nonce: randomUUID() }, { secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }), expiresIn: `${this.config.get('JWT_REFRESH_TTL_DAYS', { infer: true })}d` });
    await this.prisma.refreshSession.create({ data: { id: sessionId, userId, familyId, tokenHash: await argon2.hash(refreshToken), userAgent: meta.userAgent, ipAddress: meta.ip, expiresAt: new Date(Date.now() + this.config.get('JWT_REFRESH_TTL_DAYS', { infer: true }) * 86_400_000) } });
    return { accessToken, refreshToken, expiresIn: 900, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role } };
  }

  async refresh(token: string | undefined, meta: ClientMeta) {
    if (!token) throw new UnauthorizedException('Refresh token missing');
    let payload: { sub: string; sid: string; familyId: string };
    try { payload = await this.jwt.verifyAsync(token, { secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }) }); }
    catch { throw new UnauthorizedException('Refresh token is invalid or expired'); }
    const session = await this.prisma.refreshSession.findUnique({ where: { id: payload.sid } });
    if (!session || session.revokedAt || !(await argon2.verify(session.tokenHash, token))) {
      await this.prisma.refreshSession.updateMany({ where: { familyId: payload.familyId, revokedAt: null }, data: { revokedAt: new Date() } });
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    const next = await this.issueTokens(payload.sub, meta, payload.familyId);
    const nextPayload = await this.jwt.verifyAsync<{ sid: string }>(next.refreshToken, { secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }) });
    await this.prisma.refreshSession.update({ where: { id: session.id }, data: { revokedAt: new Date(), replacedBy: nextPayload.sid } });
    return next;
  }

  async logout(token?: string) {
    if (token) {
      try { const payload = await this.jwt.verifyAsync<{ sid: string }>(token, { secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }) }); await this.prisma.refreshSession.updateMany({ where: { id: payload.sid }, data: { revokedAt: new Date() } }); } catch { /* idempotent */ }
    }
    return { message: 'Logged out' };
  }

  async forgotPassword(emailInput: string) {
    const user = await this.prisma.user.findUnique({ where: { email: this.normalizeEmail(emailInput) } });
    if (user) await this.createChallenge(user.id, user.email, ChallengePurpose.RESET_PASSWORD);
    return { message: 'If that account exists, a reset code has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (dto.password !== dto.confirmPassword) throw new BadRequestException('Passwords do not match');
    const user = await this.consumeChallenge(dto.email, dto.code, ChallengePurpose.RESET_PASSWORD);
    await this.prisma.$transaction([
      this.prisma.passwordCredential.upsert({ where: { userId: user.id }, create: { userId: user.id, passwordHash: await argon2.hash(dto.password) }, update: { passwordHash: await argon2.hash(dto.password) } }),
      this.prisma.refreshSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) throw new BadRequestException('Passwords do not match');
    const credential = await this.prisma.passwordCredential.findUnique({ where: { userId } });
    if (credential && (!dto.currentPassword || !(await argon2.verify(credential.passwordHash, dto.currentPassword)))) throw new UnauthorizedException('Current password is incorrect');
    await this.prisma.$transaction([
      this.prisma.passwordCredential.upsert({ where: { userId }, create: { userId, passwordHash: await argon2.hash(dto.newPassword) }, update: { passwordHash: await argon2.hash(dto.newPassword) } }),
      this.prisma.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    return { message: 'Password changed successfully' };
  }

  googleAuthorizationUrl(state: string) {
    const client = new OAuth2Client(this.config.get('GOOGLE_CLIENT_ID', { infer: true }), this.config.get('GOOGLE_CLIENT_SECRET', { infer: true }), this.config.get('GOOGLE_CALLBACK_URL', { infer: true }));
    return client.generateAuthUrl({ access_type: 'offline', scope: ['openid', 'email', 'profile'], state, prompt: 'select_account' });
  }

  async googleCallback(code: string, meta: ClientMeta) {
    const client = new OAuth2Client(this.config.get('GOOGLE_CLIENT_ID', { infer: true }), this.config.get('GOOGLE_CLIENT_SECRET', { infer: true }), this.config.get('GOOGLE_CALLBACK_URL', { infer: true }));
    const { tokens } = await client.getToken(code);
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token!, audience: this.config.get('GOOGLE_CLIENT_ID', { infer: true }) });
    const profile = ticket.getPayload();
    if (!profile?.sub || !profile.email || !profile.email_verified) throw new UnauthorizedException('Google account email is not verified');
    const email = this.normalizeEmail(profile.email);
    const account = await this.prisma.oAuthAccount.findUnique({ where: { provider_providerAccountId: { provider: OAuthProvider.GOOGLE, providerAccountId: profile.sub } }, include: { user: true } });
    let user = account?.user;
    if (!user) {
      user = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.user.findUnique({ where: { email } });
        const linked = existing ?? await tx.user.create({ data: { email, firstName: profile.given_name ?? 'Google', lastName: profile.family_name ?? 'User', emailVerifiedAt: new Date() } });
        await tx.oAuthAccount.create({ data: { userId: linked.id, provider: OAuthProvider.GOOGLE, providerAccountId: profile.sub } });
        const granted = await tx.creditLedgerEntry.findFirst({ where: { userId: linked.id, type: CreditEntryType.TRIAL_GRANT } });
        if (!granted) await this.credits.grantWithClient(tx, linked.id, new Prisma.Decimal(100), 'trial', CreditEntryType.TRIAL_GRANT);
        return linked;
      });
    }
    return this.issueTokens(user.id, meta);
  }
}
