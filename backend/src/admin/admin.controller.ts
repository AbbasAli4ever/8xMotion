import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { IsBoolean, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { AdminGuard } from '../auth/admin.guard';
import { JwtGuard } from '../auth/jwt.guard';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
class UpdateModelDto { @IsOptional() @IsBoolean() active?: boolean; @IsOptional() @IsObject() capabilities?: Record<string, unknown>; }
class UpdatePriceDto { @IsNumber() @Min(0) unitCost!: number; }
class AdjustCreditDto { @IsString() userId!: string; @IsNumber() amount!: number; @IsString() reason!: string; }
@UseGuards(JwtGuard, AdminGuard) @Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}
  @Patch('models/:slug') model(@Param('slug') slug: string, @Body() dto: UpdateModelDto) { return this.prisma.modelDefinition.update({ where: { slug }, data: { active: dto.active, capabilities: dto.capabilities as Prisma.InputJsonValue | undefined } }); }
  @Patch('prices/:id') price(@Param('id') id: string, @Body() dto: UpdatePriceDto) { return this.prisma.generationPrice.update({ where: { id }, data: { unitCost: dto.unitCost } }); }
  @Patch('plans/:slug') plan(@Param('slug') slug: string, @Body() body: { active?: boolean; monthlyCredits?: number }) { return this.prisma.plan.update({ where: { slug }, data: body }); }
  @Patch('credit-packs/:slug') pack(@Param('slug') slug: string, @Body() body: { active?: boolean; credits?: number; priceCents?: number }) { return this.prisma.creditPack.update({ where: { slug }, data: body }); }
  @Patch('credits/adjust') async adjust(@Body() dto: AdjustCreditDto) { const bucket = await this.prisma.creditBucket.create({ data: { userId: dto.userId, source: `admin:${dto.reason}`, total: dto.amount, remaining: dto.amount } }); return this.prisma.creditLedgerEntry.create({ data: { userId: dto.userId, bucketId: bucket.id, type: 'ADMIN_ADJUSTMENT', amount: dto.amount, metadata: { reason: dto.reason } } }); }
}
