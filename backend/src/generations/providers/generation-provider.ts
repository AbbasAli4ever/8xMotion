import { MediaType } from '@prisma/client';

export type ProviderRequest = { generationId: string; mediaType: MediaType; providerModelId: string; prompt: string; aspectRatio: string; resolution: string; duration?: number; count: number; reference?: { bytes: Uint8Array; contentType: string } };
export type ProviderOutput = { bytes: Uint8Array; contentType: string; extension: string; width?: number; height?: number; duration?: number };
export interface GenerationProvider { generate(request: ProviderRequest): Promise<ProviderOutput[]>; }
export const GENERATION_PROVIDER = Symbol('GENERATION_PROVIDER');
