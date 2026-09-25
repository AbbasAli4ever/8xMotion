# 8xMotion

Next.js frontend with a Supabase backend. Supabase provides authentication, PostgreSQL, Row Level Security, Storage, subscriptions, credits, generation records, and asset history. The former NestJS backend is retained temporarily under `backend/` only as migration reference and is not deployed or called by the application.

## Supabase setup

1. Create a Supabase project.
2. Install the Supabase CLI and link the repository:

   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

3. In Authentication settings:
   - Enable Email/Password and Google.
   - Set the Site URL to the production Vercel URL.
   - Add local and production `/dashboard` URLs to Redirect URLs.
   - To use the OTP signup screen, change the confirmation email template to contain `{{ .Token }}`. This project currently uses Supabase's configured eight-digit OTP length.
4. Copy `.env.example` to `.env.local` and add the project URL and publishable key.

The migration at `supabase/migrations/20260926000000_initial.sql` creates and seeds all application tables, database functions, RLS policies, and the private `references` Storage bucket.

## Magic Hour generation

Image and video generation run through the `generations` Supabase Edge Function. Add
`MAGIC_HOUR_API_KEY` in Supabase Dashboard under Edge Functions > Secrets, then deploy
the database migration and function:

```bash
supabase db push
supabase functions deploy generations
```

The function uses Flux Schnell for images and LTX 2.5 at 480p for videos so it works
with Magic Hour's free tier. Generated files are copied into the private
`generated-assets` bucket and returned to authenticated owners with signed URLs.

## Local frontend

```bash
npm ci
npm run dev
```

## Vercel deployment

Import the repository into Vercel with the root directory set to `.`. Add these variables to Production and Preview:

```text
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

The publishable key is safe to expose in the frontend because authorization is enforced by PostgreSQL RLS. Never expose a Supabase secret/service-role key in a `NEXT_PUBLIC_` variable.

## Backend extension points

- Add tables, policies, triggers, and RPC functions as new timestamped files under `supabase/migrations/`.
- Use Supabase Edge Functions for third-party secrets, payment webhooks, or real AI-provider calls.
- Keep user-owned data protected with `auth.uid()` RLS policies.
- Keep privileged authorization data in `app_metadata`, not editable user metadata.
