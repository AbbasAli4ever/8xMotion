import { BillingInterval } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';
export class SubscribeDto { @IsString() planSlug!: string; @IsEnum(BillingInterval) interval!: BillingInterval; }
export class TopUpDto { @IsString() packSlug!: string; }
