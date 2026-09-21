import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { GenerationStatus, MediaType, Prisma, UploadStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import { CreditsService } from '../credits/credits.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGenerationDto, QuoteGenerationDto } from './generation.dto';

@Injectable()
export class GenerationsService {
  constructor(private readonly prisma: PrismaService, private readonly credits: CreditsService, @InjectQueue('generation') private readonly queue: Queue) {}
  async capabilities() {
    const models = await this.prisma.modelDefinition.findMany({ where: { active: true }, include: { prices: true }, orderBy: { displayName: 'asc' } });
    return { models: models.map((model) => ({ id: model.id, slug: model.slug, displayName: model.displayName, mediaType: model.mediaType, provider: model.provider, active: model.active, capabilities: model.capabilities, prices: model.prices })) };
  }
  private async validateAndQuote(dto: QuoteGenerationDto) {
    const model = await this.prisma.modelDefinition.findUnique({ where: { slug: dto.model }, include: { prices: true } });
    if (!model?.active || model.mediaType !== dto.mediaType) throw new UnprocessableEntityException({ field: 'model', message: 'Unsupported generation model' });
    const capabilities = model.capabilities as { aspectRatios: string[]; resolutions: string[]; durations?: number[]; maxCount: number; references?: boolean };
    const issues: Record<string, string> = {};
    if (!capabilities.aspectRatios.includes(dto.aspectRatio)) issues.aspectRatio = 'Unsupported aspect ratio';
    if (!capabilities.resolutions.includes(dto.resolution)) issues.resolution = 'Unsupported resolution';
    if (dto.mediaType === MediaType.VIDEO && !capabilities.durations?.includes(dto.duration!)) issues.duration = 'Unsupported duration';
    const count = dto.count ?? 1;
    if (count > capabilities.maxCount) issues.count = 'Too many outputs requested';
    if ((dto.uploadId || dto.uploadIds?.length) && !capabilities.references) issues.uploadIds = 'Reference input is not supported by this model';
    if (Object.keys(issues).length) throw new UnprocessableEntityException({ message: 'Unsupported generation options', fields: issues });
    const price = model.prices.find((item) => (item.duration ?? null) === (dto.duration ?? null) && (item.resolution ?? null) === dto.resolution)
      ?? model.prices.find((item) => item.duration === null && item.resolution === null);
    if (!price) throw new UnprocessableEntityException('No price is configured for these options');
    const cost = price.unitCost.mul(count);
    return { model, count, unitCost: price.unitCost, cost, currency: 'credits' };
  }
  async quote(dto: QuoteGenerationDto) { const { model, ...quote } = await this.validateAndQuote(dto); return { ...quote, model: model.slug }; }
  async create(userId: string, dto: CreateGenerationDto) {
    const existing = await this.prisma.generation.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: dto.idempotencyKey } }, include: { assets: true } });
    if (existing) return existing;
    const quote = await this.validateAndQuote(dto);
    const requestedUploadIds = [...new Set([...(dto.uploadIds ?? []), ...(dto.uploadId ? [dto.uploadId] : [])])];
    const uploads = requestedUploadIds.length ? await this.prisma.upload.findMany({ where: { id: { in: requestedUploadIds }, userId, status: UploadStatus.READY } }) : [];
    if (uploads.length !== requestedUploadIds.length) throw new BadRequestException('One or more reference uploads are not ready');
    const uploadsById = new Map(uploads.map((upload) => [upload.id, upload]));
    const orderedUploads = requestedUploadIds.map((id) => uploadsById.get(id)!);
    const reservation = await this.credits.reserve(userId, quote.cost);
    try {
      const generation = await this.prisma.generation.create({ data: { userId, modelId: quote.model.id, uploadId: orderedUploads[0]?.id, reservationId: reservation.id, idempotencyKey: dto.idempotencyKey, mediaType: dto.mediaType, prompt: dto.prompt, outputCount: quote.count, requestSnapshot: { model: dto.model, aspectRatio: dto.aspectRatio, resolution: dto.resolution, duration: dto.duration, count: quote.count, quality: dto.quality, cost: quote.cost.toString(), uploadIds: requestedUploadIds }, inputs: { create: orderedUploads.map((upload, position) => ({ uploadId: upload.id, position })) } }, include: { model: { select: { slug: true, displayName: true } }, inputs: { include: { upload: true }, orderBy: { position: 'asc' } } } });
      await this.queue.add('generate', { generationId: generation.id }, { jobId: generation.id, attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 1000, removeOnFail: 1000 });
      return generation;
    } catch (error) {
      await this.credits.refund(reservation.id);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Duplicate request');
      throw error;
    }
  }
  async one(userId: string, id: string) {
    const generation = await this.prisma.generation.findFirst({ where: { id, userId }, include: { model: { select: { slug: true, displayName: true } }, assets: { where: { deletedAt: null } } } });
    if (!generation) throw new NotFoundException('Generation not found');
    return generation;
  }
  async list(userId: string, page: number, limit: number, mediaType?: MediaType, status?: GenerationStatus) {
    const where = { userId, ...(mediaType ? { mediaType } : {}), ...(status ? { status } : {}) };
    const [items, total] = await this.prisma.$transaction([this.prisma.generation.findMany({ where, include: { model: { select: { slug: true, displayName: true } }, assets: { where: { deletedAt: null } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }), this.prisma.generation.count({ where })]);
    return { items, page, limit, total };
  }
  async cancel(userId: string, id: string) {
    const generation = await this.one(userId, id);
    if (generation.status !== GenerationStatus.QUEUED && generation.status !== GenerationStatus.SUBMITTED) throw new ConflictException('This generation can no longer be cancelled');
    await this.queue.remove(id);
    await this.credits.refund(generation.reservationId);
    return this.prisma.generation.update({ where: { id }, data: { status: GenerationStatus.CANCELLED, completedAt: new Date() } });
  }
  async retry(userId: string, id: string, idempotencyKey: string) {
    const previous = await this.one(userId, id);
    if (previous.status !== GenerationStatus.FAILED) throw new ConflictException('Only failed generations can be retried');
    const snapshot = previous.requestSnapshot as Record<string, unknown>;
    return this.create(userId, { mediaType: previous.mediaType, model: String(snapshot.model), prompt: previous.prompt, aspectRatio: String(snapshot.aspectRatio), resolution: String(snapshot.resolution), duration: snapshot.duration as number | undefined, count: snapshot.count as number, quality: snapshot.quality as string | undefined, uploadIds: (snapshot.uploadIds as string[] | undefined) ?? (previous.uploadId ? [previous.uploadId] : undefined), idempotencyKey });
  }
}
