import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { GenerationStatus } from '@prisma/client';
import { Job } from 'bullmq';
import { randomUUID } from 'crypto';
import { CreditsService } from '../credits/credits.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { GENERATION_PROVIDER, GenerationProvider } from './providers/generation-provider';

@Processor('generation')
export class GenerationProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService, private readonly credits: CreditsService, private readonly storage: StorageService, @Inject(GENERATION_PROVIDER) private readonly provider: GenerationProvider) { super(); }
  async process(job: Job<{ generationId: string }>) {
    const generation = await this.prisma.generation.findUniqueOrThrow({ where: { id: job.data.generationId }, include: { model: true, upload: true } });
    if (generation.status === GenerationStatus.CANCELLED) return;
    await this.prisma.generation.update({ where: { id: generation.id }, data: { status: GenerationStatus.PROCESSING } });
    try {
      const snapshot = generation.requestSnapshot as Record<string, unknown>;
      const reference = generation.upload ? await this.storage.read(generation.upload.objectKey) : undefined;
      const outputs = await this.provider.generate({ generationId: generation.id, mediaType: generation.mediaType, providerModelId: generation.model.providerModelId, prompt: generation.prompt, aspectRatio: String(snapshot.aspectRatio), resolution: String(snapshot.resolution), duration: snapshot.duration as number | undefined, count: generation.outputCount, reference });
      await this.prisma.$transaction(async (tx) => {
        for (const output of outputs) {
          const objectKey = `assets/${generation.userId}/${generation.id}/${randomUUID()}.${output.extension}`;
          await this.storage.put(objectKey, output.bytes, output.contentType);
          await tx.asset.create({ data: { userId: generation.userId, generationId: generation.id, mediaType: generation.mediaType, objectKey, contentType: output.contentType, byteSize: output.bytes.byteLength, width: output.width, height: output.height, duration: output.duration } });
        }
        await tx.generation.update({ where: { id: generation.id }, data: { status: GenerationStatus.SUCCEEDED, completedAt: new Date() } });
      });
      await this.credits.settle(generation.reservationId);
    } catch (error) {
      if (job.attemptsMade + 1 >= (job.opts.attempts ?? 1)) {
        await this.prisma.generation.update({ where: { id: generation.id }, data: { status: GenerationStatus.FAILED, errorMessage: error instanceof Error ? error.message.slice(0, 500) : 'Generation failed', completedAt: new Date() } });
        await this.credits.refund(generation.reservationId);
      }
      throw error;
    }
  }
}
