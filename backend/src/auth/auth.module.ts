import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CreditsModule } from '../credits/credits.module';
import { AdminGuard } from './admin.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtGuard } from './jwt.guard';

@Module({ imports: [JwtModule.register({}), CreditsModule], controllers: [AuthController], providers: [AuthService, JwtGuard, AdminGuard], exports: [JwtGuard, AdminGuard, JwtModule] })
export class AuthModule {}
