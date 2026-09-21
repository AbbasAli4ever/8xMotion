import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { AppEnv } from '../config/env';

@Injectable()
export class MailService {
  private readonly transport: Transporter;
  constructor(private readonly config: ConfigService<AppEnv, true>) {
    this.transport = nodemailer.createTransport({
      host: config.get('SMTP_HOST', { infer: true }), port: config.get('SMTP_PORT', { infer: true }),
      auth: config.get('SMTP_USER', { infer: true }) ? { user: config.get('SMTP_USER', { infer: true }), pass: config.get('SMTP_PASS', { infer: true }) } : undefined,
    });
  }
  async sendCode(email: string, code: string, purpose: 'verify' | 'reset') {
    await this.transport.sendMail({
      from: this.config.get('SMTP_FROM', { infer: true }), to: email,
      subject: purpose === 'verify' ? 'Verify your 8xMotion account' : 'Reset your 8xMotion password',
      text: `Your 8xMotion ${purpose === 'verify' ? 'verification' : 'password reset'} code is ${code}. It expires in 10 minutes.`,
    });
  }
}
