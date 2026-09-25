# 8xMotion API

Independent NestJS API for authentication, credits, mock subscriptions, Vertex AI generation, uploads, and assets.

This directory is a standalone Node application with its own package manifest, lockfile, environment, database migrations, tests, and Dockerfile. It does not import frontend source code.

## Local setup

1. Copy `.env.example` to `.env` and replace both JWT secrets.
2. Start infrastructure: `docker compose up -d`.
3. Install packages: `npm install`.
4. Generate Prisma client and apply migrations: `npm run prisma:generate && npm run prisma:deploy`.
5. Seed catalogs: `npm run prisma:seed`.
6. Start the API and worker: `npm run start:dev`.

The API runs at `http://localhost:4000/api/v1`, Swagger at `/api/docs`, Mailpit at `http://localhost:8025`, and the MinIO console at `http://localhost:9001`.

`GENERATION_PROVIDER=mock` copies bundled frontend demo media through the real queue/storage/credit pipeline. For Vertex AI, set `GENERATION_PROVIDER=vertex`, configure the Google Cloud project/location, and supply Application Default Credentials to the process. Google Flow cookies or account credentials are never used.

## Render deployment

The repository-level `render.yaml` creates an independent backend web service with `rootDir: backend`, plus PostgreSQL and Key Value services. Render runs Prisma migrations before each deploy and checks `/api/v1/health` before routing traffic.

1. In Render, create a Blueprint from this repository and select `render.yaml`.
2. Supply every variable marked `sync: false`. Important values:
   - `FRONTEND_URL`: the canonical Vercel URL, such as `https://your-app.vercel.app`.
   - `CORS_ORIGINS`: comma-separated allowed frontend origins. Include the canonical Vercel URL and only preview URLs you explicitly trust.
   - `S3_*`: credentials and endpoints for an S3-compatible production bucket.
   - `SMTP_*`: production email provider credentials.
   - `GOOGLE_CALLBACK_URL`: `https://YOUR-RENDER-SERVICE.onrender.com/api/v1/auth/google/callback`.
   - `GOOGLE_APPLICATION_CREDENTIALS_JSON`: the complete Google service-account JSON on one line. Render is configured with `GENERATION_PROVIDER=vertex`, so it never relies on frontend demo files.
3. Add the same callback URL to the Google OAuth client's authorized redirect URIs.
4. After Render assigns the service hostname, set Vercel's `NEXT_PUBLIC_API_URL` to `https://YOUR-RENDER-SERVICE.onrender.com/api/v1` and redeploy Vercel.

Production refresh cookies use `Secure; SameSite=None` so credentialed requests work between the Vercel and Render domains. CORS still restricts browser access to `CORS_ORIGINS`.

## Security notes

- Mock checkout refuses to start in production.
- S3/MinIO objects are private and exposed only through short-lived signed URLs.
- Refresh and verification tokens are stored only as hashes.
- Run behind TLS in production and replace all example credentials.
