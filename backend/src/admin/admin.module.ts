import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminController } from './admin.controller';
import { AdminGuard } from '../auth/admin.guard';
import { JwtGuard } from '../auth/jwt.guard';
@Module({ imports: [JwtModule.register({})], controllers: [AdminController], providers: [JwtGuard, AdminGuard] })
export class AdminModule {}
