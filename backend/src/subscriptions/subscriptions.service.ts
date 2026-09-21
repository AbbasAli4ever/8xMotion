import { ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { BillingInterval, CreditEntryType, SubscriptionStatus } from '@prisma/client';
import { AppEnv } from '../config/env';
import { CreditsService } from '../credits/credits.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService, private readonly credits: CreditsService, private readonly config: ConfigService<AppEnv, true>, @InjectQueue('subscription') private readonly queue: Queue) {}
  async onModuleInit() { await this.queue.upsertJobScheduler('subscription-renewals', { every: 60 * 60 * 1000 }, { name: 'renew-subscriptions' }); }
  plans() { return this.prisma.plan.findMany({ where: { active: true }, orderBy: { monthlyPriceCents: 'asc' } }); }
  packs() { return this.prisma.creditPack.findMany({ where: { active: true }, orderBy: { priceCents: 'asc' } }); }
  mine(userId: string) { return this.prisma.subscription.findFirst({ where: { userId, status: SubscriptionStatus.ACTIVE }, include: { plan: true }, orderBy: { createdAt: 'desc' } }); }
  private ensureMock() { if (!this.config.get('MOCK_CHECKOUT_ENABLED', { infer: true })) throw new ForbiddenException('Mock checkout is disabled'); }
  private addMonths(date: Date, count: number) { const next = new Date(date); next.setUTCMonth(next.getUTCMonth() + count); return next; }

  async subscribe(userId: string, planSlug: string, interval: BillingInterval) {
    this.ensureMock();
    const plan = await this.prisma.plan.findUnique({ where: { slug: planSlug } });
    if (!plan?.active) throw new NotFoundException('Plan not found');
    const now = new Date(); const periodEnd = this.addMonths(now, 1);
    return this.prisma.$transaction(async (tx) => {
      await tx.subscription.updateMany({ where: { userId, status: SubscriptionStatus.ACTIVE }, data: { status: SubscriptionStatus.CANCELLED } });
      const subscription = await tx.subscription.create({ data: { userId, planId: plan.id, interval, currentPeriodStart: now, currentPeriodEnd: periodEnd } });
      const period = await tx.subscriptionPeriod.create({ data: { subscriptionId: subscription.id, startsAt: now, endsAt: periodEnd, grantedAt: now } });
      await this.credits.grantWithClient(tx, userId, plan.monthlyCredits, `subscription:${subscription.id}`, CreditEntryType.SUBSCRIPTION_GRANT, periodEnd, period.id);
      return tx.subscription.findUniqueOrThrow({ where: { id: subscription.id }, include: { plan: true } });
    });
  }

  async topUp(userId: string, packSlug: string) {
    this.ensureMock();
    const pack = await this.prisma.creditPack.findUnique({ where: { slug: packSlug } });
    if (!pack?.active) throw new NotFoundException('Credit pack not found');
    return this.prisma.$transaction((tx) => this.credits.grantWithClient(tx, userId, pack.credits, `topup:${pack.id}`, CreditEntryType.TOP_UP, undefined, `mock-${Date.now()}`));
  }

  async cancel(userId: string) {
    const active = await this.mine(userId);
    if (!active) throw new NotFoundException('No active subscription');
    return this.prisma.subscription.update({ where: { id: active.id }, data: { cancelAtPeriodEnd: true }, include: { plan: true } });
  }

  async renewDue() {
    const due = await this.prisma.subscription.findMany({ where: { status: SubscriptionStatus.ACTIVE, currentPeriodEnd: { lte: new Date() } }, include: { plan: true } });
    for (const subscription of due) {
      await this.prisma.$transaction(async (tx) => {
        if (subscription.cancelAtPeriodEnd) { await tx.subscription.update({ where: { id: subscription.id }, data: { status: SubscriptionStatus.EXPIRED } }); return; }
        const start = subscription.currentPeriodEnd; const end = this.addMonths(start, 1);
        const period = await tx.subscriptionPeriod.create({ data: { subscriptionId: subscription.id, startsAt: start, endsAt: end, grantedAt: new Date() } });
        await tx.subscription.update({ where: { id: subscription.id }, data: { currentPeriodStart: start, currentPeriodEnd: end } });
        await this.credits.grantWithClient(tx, subscription.userId, subscription.plan.monthlyCredits, `subscription:${subscription.id}`, CreditEntryType.SUBSCRIPTION_GRANT, end, period.id);
      });
    }
    return due.length;
  }
}

@Processor('subscription')
export class SubscriptionProcessor extends WorkerHost {
  constructor(private readonly subscriptions: SubscriptionsService) { super(); }
  process(job: Job) { return job.name === 'renew-subscriptions' ? this.subscriptions.renewDue() : Promise.resolve(0); }
}
