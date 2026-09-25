import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { AppEnv } from '../config/env';
import { ChangePasswordDto, EmailCodeDto, EmailDto, LoginDto, ResetPasswordDto, SignupDto } from './auth.dto';
import { AuthService } from './auth.service';
import { JwtGuard } from './jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: ConfigService<AppEnv, true>) {}
  private meta(req: Request) { return { ip: req.ip, userAgent: req.headers['user-agent'] }; }
  private cookieSecurity() {
    const production = this.config.get('NODE_ENV', { infer: true }) === 'production';
    return { secure: production, sameSite: production ? 'none' as const : 'lax' as const };
  }
  private setRefresh(res: Response, token: string) {
    res.cookie('refresh_token', token, { httpOnly: true, ...this.cookieSecurity(), path: '/api/v1/auth', maxAge: this.config.get('JWT_REFRESH_TTL_DAYS', { infer: true }) * 86_400_000 });
  }
  private respondWithTokens(res: Response, result: Awaited<ReturnType<AuthService['login']>>) { this.setRefresh(res, result.refreshToken); return { accessToken: result.accessToken, expiresIn: result.expiresIn, user: result.user }; }

  @Post('signup') signup(@Body() dto: SignupDto) { return this.auth.signup(dto); }
  @Post('verify-email') async verify(@Body() dto: EmailCodeDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.respondWithTokens(res, await this.auth.verifyEmail(dto.email, dto.code, this.meta(req))); }
  @Post('resend-verification') resend(@Body() dto: EmailDto) { return this.auth.resendVerification(dto.email); }
  @Post('login') async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.respondWithTokens(res, await this.auth.login(dto, this.meta(req))); }
  @Post('refresh') async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.respondWithTokens(res, await this.auth.refresh(req.cookies?.refresh_token, this.meta(req))); }
  @Post('logout') async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) { const result = await this.auth.logout(req.cookies?.refresh_token); res.clearCookie('refresh_token', { ...this.cookieSecurity(), path: '/api/v1/auth' }); return result; }
  @Post('forgot-password') forgot(@Body() dto: EmailDto) { return this.auth.forgotPassword(dto.email); }
  @Post('reset-password') reset(@Body() dto: ResetPasswordDto) { return this.auth.resetPassword(dto); }
  @UseGuards(JwtGuard) @Post('change-password') change(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) { return this.auth.changePassword(user.id, dto); }

  @Get('google') google(@Res() res: Response) {
    const state = randomBytes(24).toString('hex');
    res.cookie('oauth_state', state, { httpOnly: true, ...this.cookieSecurity(), maxAge: 600_000, path: '/api/v1/auth/google/callback' });
    return res.redirect(this.auth.googleAuthorizationUrl(state));
  }
  @Get('google/callback') async callback(@Query('code') code: string, @Query('state') state: string, @Req() req: Request, @Res() res: Response) {
    if (!code || !state || state !== req.cookies?.oauth_state) return res.redirect(`${this.config.get('FRONTEND_URL', { infer: true })}/?authError=oauth_state`);
    const result = await this.auth.googleCallback(code, this.meta(req));
    this.setRefresh(res, result.refreshToken);
    res.clearCookie('oauth_state', { path: '/api/v1/auth/google/callback' });
    return res.redirect(`${this.config.get('FRONTEND_URL', { infer: true })}/dashboard?oauth=success`);
  }
}
