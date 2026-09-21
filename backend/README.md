# 8xMotion API

Independent NestJS API for authentication, credits, mock subscriptions, Vertex AI generation, uploads, and assets.

## Local setup

1. Copy `.env.example` to `.env` and replace both JWT secrets.
2. Start infrastructure: `docker compose up -d`.
3. Install packages: `npm install`.
4. Generate Prisma client and apply migrations: `npm run prisma:generate && npm run prisma:deploy`.
5. Seed catalogs: `npm run prisma:seed`.
6. Start the API and worker: `npm run start:dev`.

The API runs at `http://localhost:4000/api/v1`, Swagger at `/api/docs`, Mailpit at `http://localhost:8025`, and the MinIO console at `http://localhost:9001`.

`GENERATION_PROVIDER=mock` copies bundled frontend demo media through the real queue/storage/credit pipeline. For Vertex AI, set `GENERATION_PROVIDER=vertex`, configure the Google Cloud project/location, and supply Application Default Credentials to the process. Google Flow cookies or account credentials are never used.

## Security notes

- Mock checkout refuses to start in production.
- S3/MinIO objects are private and exposed only through short-lived signed URLs.
- Refresh and verification tokens are stored only as hashes.
- Run behind TLS in production and replace all example credentials.
