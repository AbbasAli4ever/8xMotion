import { access, readFile, readdir } from 'fs/promises';
import { resolve } from 'path';
import { GenerationProvider, ProviderRequest } from './generation-provider';

export class MockGenerationProvider implements GenerationProvider {
  private async mockRoot() {
    const candidates = [process.env.MOCK_ASSET_ROOT, resolve(process.cwd(), '../public/Mock'), resolve(process.cwd(), 'public/Mock'), '/public/Mock'].filter(Boolean) as string[];
    for (const candidate of candidates) {
      try { await access(candidate); return candidate; } catch { /* try the next supported runtime layout */ }
    }
    throw new Error('Mock asset folder is unavailable');
  }

  async generate(request: ProviderRequest) {
    const isVideo = request.mediaType === 'VIDEO';
    const ratio = request.aspectRatio === '9:16' ? '9:16' : '16:9';
    const folder = resolve(await this.mockRoot(), isVideo ? 'videos' : 'images', ratio);
    const files = (await readdir(folder)).filter((file) => isVideo ? file.toLowerCase().endsWith('.mp4') : /\.(jpe?g|png|webp)$/i.test(file)).sort();
    if (!files.length) throw new Error(`No ${request.mediaType.toLowerCase()} mock assets found for ${ratio}`);

    if (process.env.NODE_ENV !== 'test') {
      const minimum = isVideo ? 10_000 : 5_000;
      const variance = isVideo ? 5_000 : 2_000;
      await new Promise((done) => setTimeout(done, minimum + Math.floor(Math.random() * (variance + 1))));
    }

    const seed = [...request.generationId].reduce((total, character) => total + character.charCodeAt(0), 0);
    return Promise.all(Array.from({ length: request.count }, async (_, index) => {
      const filename = files[(seed + index) % files.length];
      const extension = filename.split('.').pop()?.toLowerCase() ?? (isVideo ? 'mp4' : 'jpg');
      return { bytes: new Uint8Array(await readFile(resolve(folder, filename))), contentType: isVideo ? 'video/mp4' : extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg', extension, duration: isVideo ? request.duration : undefined };
    }));
  }
}
