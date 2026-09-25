import 'reflect-metadata';
import { randomUUID } from 'crypto';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/http-exception.filter';
import { AppEnv } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
  const config = app.get<ConfigService<AppEnv, true>>(ConfigService);
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.setGlobalPrefix(config.get('API_PREFIX', { infer: true }));
  app.use(helmet());
  app.use(cookieParser());
  app.use((request: { id?: string; headers: Record<string, unknown> }, response: { setHeader: (key: string, value: string) => void }, next: () => void) => {
    request.id = String(request.headers['x-request-id'] ?? randomUUID());
    response.setHeader('x-request-id', request.id);
    next();
  });
  const allowedOrigins = (config.get('CORS_ORIGINS', { infer: true }) ?? config.get('FRONTEND_URL', { infer: true }))
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) return callback(null, true);
      return callback(new Error('Origin is not allowed by CORS'), false);
    },
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new ApiExceptionFilter());

  if (config.get('SWAGGER_ENABLED', { infer: true })) {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('8xMotion API').setVersion('1.0').addBearerAuth().build());
    SwaggerModule.setup('api/docs', app, document);
  }
  await app.listen(config.get('PORT', { infer: true }));
}

void bootstrap();
