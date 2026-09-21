import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtGuard } from '../auth/jwt.guard';
import { AssetsController } from './assets.controller';
@Module({ imports: [JwtModule.register({})], controllers: [AssetsController], providers: [JwtGuard] })
export class AssetsModule {}
