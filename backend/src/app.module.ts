import { BullModule } from '@nestjs/bullmq';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AdminModule } from './admin/admin.module';
import { AssetsModule } from './assets/assets.module';
import { AuthModule } from './auth/auth.module';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { AppEnv, validateEnv } from './config/env';
import { CreditsModule } from './credits/credits.module';
import { GenerationsModule } from './generations/generations.module';
import { HealthModule } from './health/health.module';
import { MailModule } from './mail/mail.module';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    BullModule.forRootAsync({ inject: [ConfigService], useFactory: (config: ConfigService<AppEnv, true>) => ({ connection: { url: config.get('REDIS_URL', { infer: true }) } }) }),
    PrismaModule, MailModule, CreditsModule, AuthModule, UsersModule, SubscriptionsModule, StorageModule, GenerationsModule, AssetsModule, AdminModule, HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule { configure(consumer: MiddlewareConsumer) { consumer.apply(RequestIdMiddleware).forRoutes('*'); } }
