import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtGuard } from '../auth/jwt.guard';
import { AppEnv } from '../config/env';
import { GenerationProcessor } from './generation.processor';
import { GenerationsController } from './generations.controller';
import { GenerationsService } from './generations.service';
import { GENERATION_PROVIDER } from './providers/generation-provider';
import { MockGenerationProvider } from './providers/mock.provider';
import { VertexGenerationProvider } from './providers/vertex.provider';

@Module({
  imports: [JwtModule.register({}), BullModule.registerQueue({ name: 'generation' })],
  controllers: [GenerationsController],
  providers: [GenerationsService, GenerationProcessor, MockGenerationProvider, VertexGenerationProvider, JwtGuard, {
    provide: GENERATION_PROVIDER,
    inject: [ConfigService, MockGenerationProvider, VertexGenerationProvider],
    useFactory: (config: ConfigService<AppEnv, true>, mock: MockGenerationProvider, vertex: VertexGenerationProvider) => config.get('GENERATION_PROVIDER', { infer: true }) === 'vertex' ? vertex : mock,
  }],
})
export class GenerationsModule {}
