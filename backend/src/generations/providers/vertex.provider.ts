import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuth } from 'google-auth-library';
import { setTimeout as delay } from 'timers/promises';
import { AppEnv } from '../../config/env';
import { GenerationProvider, ProviderOutput, ProviderRequest } from './generation-provider';

@Injectable()
export class VertexGenerationProvider implements GenerationProvider {
  private readonly auth: GoogleAuth;
  constructor(private readonly config: ConfigService<AppEnv, true>) {
    const credentialsJson = config.get('GOOGLE_APPLICATION_CREDENTIALS_JSON', { infer: true });
    this.auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      projectId: config.get('GOOGLE_CLOUD_PROJECT', { infer: true }),
      ...(credentialsJson ? { credentials: JSON.parse(credentialsJson) as Record<string, string> } : {}),
    });
  }
  private base() { return `https://${this.config.get('GOOGLE_CLOUD_LOCATION', { infer: true })}-aiplatform.googleapis.com/v1/projects/${this.config.get('GOOGLE_CLOUD_PROJECT', { infer: true })}/locations/${this.config.get('GOOGLE_CLOUD_LOCATION', { infer: true })}/publishers/google/models`; }
  private async post(url: string, body: unknown) {
    const client = await this.auth.getClient();
    const response = await client.request<{ predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }>; name?: string; done?: boolean; response?: { videos?: Array<{ bytesBase64Encoded?: string; mimeType?: string; gcsUri?: string }> }; error?: { message?: string } }>({ url, method: 'POST', data: body });
    return response.data;
  }
  async generate(request: ProviderRequest): Promise<ProviderOutput[]> {
    if (request.mediaType === 'IMAGE') {
      const result = await this.post(`${this.base()}/${request.providerModelId}:predict`, { instances: [{ prompt: request.prompt }], parameters: { sampleCount: request.count, aspectRatio: request.aspectRatio, sampleImageSize: request.resolution, outputOptions: { mimeType: 'image/png' } } });
      const outputs = (result.predictions ?? []).flatMap((item) => item.bytesBase64Encoded ? [{ bytes: new Uint8Array(Buffer.from(item.bytesBase64Encoded, 'base64')), contentType: item.mimeType ?? 'image/png', extension: 'png' }] : []);
      if (!outputs.length) throw new BadGatewayException('Vertex AI returned no image output');
      return outputs;
    }
    const reference = request.reference ? { image: { bytesBase64Encoded: Buffer.from(request.reference.bytes).toString('base64'), mimeType: request.reference.contentType } } : {};
    const started = await this.post(`${this.base()}/${request.providerModelId}:predictLongRunning`, { instances: [{ prompt: request.prompt, ...reference }], parameters: { sampleCount: request.count, aspectRatio: request.aspectRatio, resolution: request.resolution, durationSeconds: request.duration } });
    if (!started.name) throw new BadGatewayException('Vertex AI did not return an operation');
    for (let attempt = 0; attempt < 90; attempt++) {
      await delay(10_000);
      const polled = await this.post(`${this.base()}/${request.providerModelId}:fetchPredictOperation`, { operationName: started.name });
      if (polled.error) throw new BadGatewayException(polled.error.message ?? 'Vertex video generation failed');
      if (!polled.done) continue;
      const outputs = (polled.response?.videos ?? []).flatMap((item) => item.bytesBase64Encoded ? [{ bytes: new Uint8Array(Buffer.from(item.bytesBase64Encoded, 'base64')), contentType: item.mimeType ?? 'video/mp4', extension: 'mp4', duration: request.duration }] : []);
      if (!outputs.length) throw new BadGatewayException('Vertex AI returned no inline video output');
      return outputs;
    }
    throw new BadGatewayException('Vertex video generation timed out');
  }
}
