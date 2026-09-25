import { z } from 'zod';

const bool = z.enum(['true', 'false']).transform((value) => value === 'true');

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().default('api/v1'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().optional(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_CALLBACK_URL: z.string().url().default('http://localhost:4000/api/v1/auth/google/callback'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default('8xMotion <noreply@8xmotion.local>'),
  S3_ENDPOINT: z.string().url().optional(),
  S3_PUBLIC_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('8xmotion'),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: bool.default(true),
  GENERATION_PROVIDER: z.enum(['mock', 'vertex']).default('mock'),
  GOOGLE_CLOUD_PROJECT: z.string().default(''),
  GOOGLE_CLOUD_LOCATION: z.string().default('us-central1'),
  GOOGLE_APPLICATION_CREDENTIALS_JSON: z.string().optional(),
  MOCK_CHECKOUT_ENABLED: bool.default(true),
  SWAGGER_ENABLED: bool.default(true),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>) {
  const result = envSchema.safeParse(raw);
  if (!result.success) throw new Error(`Invalid environment: ${result.error.message}`);
  if (result.data.NODE_ENV === 'production' && result.data.MOCK_CHECKOUT_ENABLED) {
    throw new Error('MOCK_CHECKOUT_ENABLED must be false in production');
  }
  return result.data;
}
