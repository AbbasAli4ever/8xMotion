import { MediaType, PrismaClient, ProviderKind } from '@prisma/client';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

if (existsSync('.env')) loadEnvFile();
const prisma = new PrismaClient();

async function main() {
  await prisma.plan.upsert({ where: { slug: 'creator' }, update: {}, create: { slug: 'creator', name: 'Creator', monthlyPriceCents: 2900, yearlyPriceCents: 26400, monthlyCredits: 600 } });
  await prisma.plan.upsert({ where: { slug: 'studio' }, update: {}, create: { slug: 'studio', name: 'Studio', monthlyPriceCents: 7900, yearlyPriceCents: 74400, monthlyCredits: 2500 } });
  await prisma.creditPack.upsert({ where: { slug: 'boost-100' }, update: {}, create: { slug: 'boost-100', name: '100 credit boost', priceCents: 500, credits: 100 } });
  await prisma.creditPack.upsert({ where: { slug: 'boost-500' }, update: {}, create: { slug: 'boost-500', name: '500 credit boost', priceCents: 2000, credits: 500 } });

  const image = await prisma.modelDefinition.upsert({
    where: { slug: 'imagen-4-fast' }, update: { capabilities: { aspectRatios: ['16:9', '9:16'], resolutions: ['1K', '2K'], qualities: ['High'], maxCount: 4, references: true } },
    create: { slug: 'imagen-4-fast', displayName: 'Imagen 4 Fast', mediaType: MediaType.IMAGE, provider: ProviderKind.VERTEX, providerModelId: 'imagen-4.0-fast-generate-001', capabilities: { aspectRatios: ['16:9', '9:16'], resolutions: ['1K', '2K'], qualities: ['High'], maxCount: 4, references: true } },
  });
  for (const resolution of ['1K', '2K']) {
    const existing = await prisma.generationPrice.findFirst({ where: { modelId: image.id, duration: null, resolution } });
    if (!existing) await prisma.generationPrice.create({ data: { modelId: image.id, resolution, unitCost: 6.5 } });
  }

  const video = await prisma.modelDefinition.upsert({
    where: { slug: 'veo-3-1-fast' }, update: {},
    create: { slug: 'veo-3-1-fast', displayName: 'Veo 3.1 Fast', mediaType: MediaType.VIDEO, provider: ProviderKind.VERTEX, providerModelId: 'veo-3.1-fast-generate-001', capabilities: { aspectRatios: ['16:9', '9:16'], resolutions: ['720p', '1080p'], durations: [4, 6, 8], maxCount: 1, references: true } },
  });
  for (const duration of [4, 6, 8]) for (const resolution of ['720p', '1080p']) {
    const base = duration === 4 ? 60 : duration === 6 ? 90 : 120;
    await prisma.generationPrice.upsert({ where: { modelId_duration_resolution: { modelId: video.id, duration, resolution } }, update: {}, create: { modelId: video.id, duration, resolution, unitCost: resolution === '1080p' ? base * 1.25 : base } });
  }
}

main().finally(() => prisma.$disconnect());
