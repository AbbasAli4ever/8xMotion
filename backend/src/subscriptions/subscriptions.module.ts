import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtGuard } from '../auth/jwt.guard';
import { BullModule } from '@nestjs/bullmq';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionProcessor, SubscriptionsService } from './subscriptions.service';
@Module({ imports: [JwtModule.register({}), BullModule.registerQueue({ name: 'subscription' })], controllers: [SubscriptionsController], providers: [SubscriptionsService, SubscriptionProcessor, JwtGuard], exports: [SubscriptionsService] })
export class SubscriptionsModule {}
