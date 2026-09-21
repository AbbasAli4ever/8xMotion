import { Global, Module } from '@nestjs/common';
import { CreditsController } from './credits.controller';
import { CreditsService } from './credits.service';
import { JwtModule } from '@nestjs/jwt';
import { JwtGuard } from '../auth/jwt.guard';
@Global() @Module({ imports: [JwtModule.register({})], controllers: [CreditsController], providers: [CreditsService, JwtGuard], exports: [CreditsService] })
export class CreditsModule {}
