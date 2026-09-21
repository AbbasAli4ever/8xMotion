import { MediaType } from '@prisma/client';
import { MockGenerationProvider } from './mock.provider';

describe('MockGenerationProvider', () => {
  it('returns the requested number of image assets', async () => {
    const provider = new MockGenerationProvider();
    const outputs = await provider.generate({ generationId: 'test', mediaType: MediaType.IMAGE, providerModelId: 'mock', prompt: 'test', aspectRatio: '1:1', resolution: '1K', count: 2 });
    expect(outputs).toHaveLength(2); expect(outputs[0].contentType).toBe('image/jpeg'); expect(outputs[0].bytes.byteLength).toBeGreaterThan(0);
  });
});
