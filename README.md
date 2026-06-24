# X7 Music Group — Next.js app (`web/`)

The X7 platform migrated from MERN (Express API + Vite/React SPA) to a single
**Next.js 14 App Router** app deployed on **Vercel**. MongoDB Atlas and the
business logic are unchanged; the old `server/` and `client/` folders are kept
for reference until this app is verified in production, then can be removed.

## Stack
- **Next.js 14** (App Router) — pages (`src/app/(public|portal|admin)`) + API route handlers (`src/app/api/**`)
- **MongoDB Atlas** via Mongoose (`src/lib/db.ts` — serverless-safe cached connection; models in `src/lib/models/`)
- **Auth:** JWT in `localStorage` (`x7_token`), verified by `src/lib/auth.ts` (`requireAuth` / `requireAdmin`)
- **Payments:** Stripe Checkout; webhook at `src/app/api/payments/webhook/route.ts` (reads raw body via `req.text()`)
- **Email:** Nodemailer (Namecheap SMTP) — `src/lib/services/email.ts`
- **File uploads:** **Vercel Blob** (`src/lib/blob.ts`) — replaces the old Multer disk storage (Vercel's FS is ephemeral)
- **i18n:** `src/context/LanguageContext` (`useLanguage()` → `t('key')`), locales in `src/locales/`

## Local development
```bash
cd web
cp .env.example .env.local      # fill in real values
npm install
npm run dev                     # http://localhost:3000 (API + UI on one origin)
npm run seed                    # one-time: seed services + schedule + 4 artists
```

## Environment variables
See `.env.example`. Required: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SMTP_*`, and `BLOB_READ_WRITE_TOKEN`
(auto-provisioned when you add Blob storage in the Vercel dashboard).
`CLIENT_URL` should be the deployed site origin (used in emails + Stripe redirects + unsubscribe links).

## Deploy to Vercel
1. Import the repo in Vercel and set the **Root Directory** to `web`.
2. Add all env vars from `.env.example` in Project Settings → Environment Variables.
3. Storage → create a **Blob** store (sets `BLOB_READ_WRITE_TOKEN` automatically).
4. Add the Stripe webhook endpoint `https://<domain>/api/payments/webhook` and put its
   signing secret in `STRIPE_WEBHOOK_SECRET`.
5. MongoDB Atlas: allow `0.0.0.0/0` (Vercel egress IPs are dynamic).

## What changed from the old stack (parity notes)
- API base path is still `/api/*`; the client API modules are unchanged.
- Uploaded image/file URLs are now absolute Vercel Blob URLs (were `/uploads/...`).
- The Express raw-body webhook ordering is replaced by reading `req.text()` in the route handler.
- Route guards (`protect`/`adminOnly`) → `requireAuth`/`requireAdmin` in `src/lib/auth.ts`;
  client-side `ProtectedRoute`/`AdminRoute` → `src/components/auth/RouteGuards.tsx` + the `portal`/`admin` layouts.
