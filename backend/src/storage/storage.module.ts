import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtGuard } from '../auth/jwt.guard';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
@Global() @Module({ imports: [JwtModule.register({})], controllers: [StorageController], providers: [StorageService, JwtGuard], exports: [StorageService] })
export class StorageModule {}
