import { validateEnv } from './env';

const required = {
  DATABASE_URL: 'postgresql://localhost/test', REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'a'.repeat(32), JWT_REFRESH_SECRET: 'b'.repeat(32),
  S3_ACCESS_KEY_ID: 'test', S3_SECRET_ACCESS_KEY: 'test',
};

describe('environment validation', () => {
  it('accepts safe local defaults', () => { expect(validateEnv(required)).toMatchObject({ GENERATION_PROVIDER: 'mock', MOCK_CHECKOUT_ENABLED: true }); });
  it('refuses mock checkout in production', () => { expect(() => validateEnv({ ...required, NODE_ENV: 'production', MOCK_CHECKOUT_ENABLED: 'true' })).toThrow('MOCK_CHECKOUT_ENABLED'); });
});
