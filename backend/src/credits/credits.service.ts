import { HttpException, Injectable } from '@nestjs/common';
import { CreditEntryType, Prisma, PrismaClient, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;
type Allocation = { bucketId: string; amount: string };

@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}
  async grantWithClient(tx: Tx, userId: string, amount: Prisma.Decimal, source: string, type: CreditEntryType, expiresAt?: Date, referenceId?: string) {
    const bucket = await tx.creditBucket.create({ data: { userId, source, total: amount, remaining: amount, expiresAt } });
    await tx.creditLedgerEntry.create({ data: { userId, bucketId: bucket.id, type, amount, referenceId } });
    return bucket;
  }
  async balance(userId: string) {
    const result = await this.prisma.creditBucket.aggregate({ where: { userId, remaining: { gt: 0 }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, _sum: { remaining: true } });
    return { balance: result._sum.remaining?.toString() ?? '0' };
  }
  async ledger(userId: string, page = 1, limit = 25) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.creditLedgerEntry.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.creditLedgerEntry.count({ where: { userId } }),
    ]);
    return { items, page, limit, total };
  }
  async reserve(userId: string, amount: Prisma.Decimal) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
      const buckets = await tx.creditBucket.findMany({ where: { userId, remaining: { gt: 0 }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, orderBy: [{ expiresAt: 'asc' }, { createdAt: 'asc' }] });
      const available = buckets.reduce((sum, bucket) => sum.add(bucket.remaining), new Prisma.Decimal(0));
      if (available.lessThan(amount)) throw new HttpException({ message: 'Insufficient credits', required: amount.toString(), available: available.toString() }, 402);
      let needed = amount; const allocations: Allocation[] = [];
      for (const bucket of buckets) {
        if (needed.isZero()) break;
        const take = Prisma.Decimal.min(needed, bucket.remaining);
        await tx.creditBucket.update({ where: { id: bucket.id }, data: { remaining: { decrement: take } } });
        allocations.push({ bucketId: bucket.id, amount: take.toString() }); needed = needed.sub(take);
      }
      const reservation = await tx.creditReservation.create({ data: { userId, amount, allocations: allocations as unknown as Prisma.InputJsonValue } });
      await tx.creditLedgerEntry.create({ data: { userId, type: CreditEntryType.RESERVATION, amount: amount.neg(), referenceId: reservation.id } });
      return reservation;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  async settle(reservationId: string) {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.creditReservation.findUniqueOrThrow({ where: { id: reservationId } });
      if (reservation.status !== ReservationStatus.RESERVED) return reservation;
      await tx.creditLedgerEntry.create({ data: { userId: reservation.userId, type: CreditEntryType.SETTLEMENT, amount: new Prisma.Decimal(0), referenceId: reservation.id } });
      return tx.creditReservation.update({ where: { id: reservation.id }, data: { status: ReservationStatus.SETTLED } });
    });
  }
  async refund(reservationId: string) {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.creditReservation.findUniqueOrThrow({ where: { id: reservationId } });
      if (reservation.status !== ReservationStatus.RESERVED) return reservation;
      for (const allocation of reservation.allocations as unknown as Allocation[]) await tx.creditBucket.update({ where: { id: allocation.bucketId }, data: { remaining: { increment: new Prisma.Decimal(allocation.amount) } } });
      await tx.creditLedgerEntry.create({ data: { userId: reservation.userId, type: CreditEntryType.REFUND, amount: reservation.amount, referenceId: reservation.id } });
      return tx.creditReservation.update({ where: { id: reservation.id }, data: { status: ReservationStatus.REFUNDED } });
    });
  }
}
