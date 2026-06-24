# X7 Music — Mongo → Supabase Migration Plan (proposal, no code yet)

**Status:** proposal for review. Nothing in this doc has been implemented.
**Author:** drafted from the current `web/` (Next.js 14) codebase.

## 1. Why consider it
Your BolivAI platform already runs on Supabase (Postgres + pgvector + RLS + supabase-js).
Moving X7 there unifies both products on one stack and yields three concrete wins:

1. **Supabase Auth** replaces the custom JWT-in-localStorage scheme (flagged in the security
   audit as XSS-exfiltratable). Managed sessions (httpOnly cookies, refresh tokens), built-in
   password reset/email confirm — and we delete the hand-rolled login/reset/`passwordChangedAt` code.
2. **Row-Level Security (RLS)** enforces per-user data scoping *in the database*. Today that
   scoping is hand-rolled in ~60 route handlers (`requireAuth`, ownership checks,
   `.select('-adminNotes')`, PII projections). RLS makes it default-on and far harder to get wrong.
3. **pgvector** for the company brain — a real vector index instead of the in-app cosine scan,
   identical to BolivAI's brain (reuse its `search_company`-style RPC).

Unchanged by this migration: **Vercel Blob** uploads, **Stripe** (Checkout + webhook), **Nodemailer** email, the **Next.js** app shell, all UI/pages, i18n, the AI agent's tool *design*.

## 2. What has to move (current inventory)
- **17 Mongoose models** → Postgres tables: User, Service, Booking, Availability, Invoice,
  Document, Message, CatalogEntry, BlogPost, Release, Event, Artist, Subscriber, Campaign,
  SplitSheet, BrainChunk, Resource.
- **~60 API route handlers** under `web/src/app/api/**` — every Mongoose query → supabase-js.
- **Auth layer**: `web/src/lib/auth.ts` (JWT verify, guards), `web/src/context/AuthContext.tsx`,
  `web/src/api/axiosInstance.ts` (token interceptor), the 4 auth pages, `RouteGuards.tsx`.
- **Company brain**: `BrainChunk.embedding` (1536-d) + `web/src/lib/agent/brain.ts` cosine search
  → pgvector column + RPC. Agent tools (`web/src/lib/agent/tools.ts`) query models → supabase.
- **Scripts**: `seed.ts`, `reset-admin.ts` → SQL seeds / Supabase Auth admin API.

## 3. Target architecture (recommended shape)
**Keep the Next.js App Router + API-route structure** (smallest delta). Swap the internals:
- `@supabase/ssr` server client reads the session from cookies in route handlers / server components.
- Route handlers stay, but: `requireAuth/requireAdmin` → read Supabase session; Mongoose queries →
  supabase-js; **RLS** becomes the real enforcement (route checks become a thin first line).
- Service-role client (server-only) for system ops that must bypass RLS: Stripe webhook,
  newsletter broadcasts, admin data tools.
- `profiles` table (1:1 with `auth.users`) holds `first_name,last_name,role,company,phone,avatar_url,
  is_active,stripe_customer_id`. Role surfaced as a JWT claim via an auth hook so RLS can read it.

## 4. Schema mapping (highlights)
- Mongo `_id` (ObjectId) → `id uuid default gen_random_uuid()` (or keep legacy ids as `text` during migration).
- Enums (`booking.status`, `event.type`, `catalog.status`, `brain.visibility`, …) → Postgres `enum` types or `text` + `check`.
- Nested objects (`streamingLinks`, `socialLinks`, `splitSheet.writers[]`) → `jsonb` (or child tables for writers if you want querying).
- `cents` money fields → `integer` (unchanged semantics).
- `BrainChunk.embedding number[]` → `vector(1536)` (pgvector); carry vectors over directly (same embed model) — no re-embed needed.
- FKs: `bookings.client_id → profiles.id`, `catalog.client_id`, `documents.client_id`, `invoices.client_id`, etc.

## 5. Auth migration (the keystone — highest risk)
- Replace `signup`/`login`/`reset` with `supabase.auth.signUp / signInWithPassword / resetPasswordForEmail`.
- `AuthContext` → Supabase session listener; drop `x7_token` localStorage + axios interceptor.
- Route guards read the cookie session; **role** comes from a custom JWT claim (auth hook reading `profiles.role`).
- Admin creation = Supabase Auth admin API (replaces `reset-admin.ts`).
- **Removes** the custom bcrypt/reset-token/`passwordChangedAt` logic entirely.

## 6. RLS policy design (security-critical — must be exact)
Enable RLS on every table. Sketch:
- `profiles`: select/update own (`id = auth.uid()`); admin select all (role claim = 'admin').
- `bookings/catalog/documents/invoices`: client `select` where `client_id = auth.uid()`; admin all; the
  `adminNotes`/private fields handled via column-level views or split tables (clients never select them).
- Public content (`services/artists/releases/events/blog_posts/resources`): anon `select` where
  `is_published/is_active = true`; write = admin only. (Mirrors the `?all`/`?preview` admin gating.)
- `subscribers/campaigns/messages/brain_chunks`: admin only; plus narrow anon `insert` policies for
  public subscribe / contact / resource-request (or route those through the service-role client).
- Brain `visibility`: anon/client policy returns only `visibility='public'`; admin sees all.
- **The agent**, running with the user's session, is auto-scoped by RLS — this replaces most of the
  hand-rolled tool scoping. Re-audit required: a wrong policy = a data leak.

## 7. Data migration (Atlas → Postgres)
- One-off ETL script: read each Mongo collection (mongoose), transform, insert via Supabase service client.
- Maintain an `oldObjectId → newUuid` map for FK rewrites.
- Users were just wiped, so existing `bookings/catalog/documents/invoices` reference deleted users —
  decide: migrate-and-orphan, or start those tables fresh. Content tables (services, artists, releases,
  events, blog, resources, subscribers, split sheets, brain) migrate cleanly.

## 8. Recommended phasing (ship-safe, incremental)
- **Phase 0 — Provision**: new Supabase project (separate from BolivAI), `pgvector` on, schema + migrations + RLS, seed. *No app change.*
- **Phase 1 — Auth**: cut over to Supabase Auth end-to-end (server client, middleware, AuthContext, auth pages, guards). Keystone.
- **Phase 2 — Data access**: port route handlers Mongoose→supabase, table-by-table — public reads first, then client-scoped, then admin, then writes. Lean on RLS.
- **Phase 3 — Brain + agent**: BrainChunk→pgvector + RPC; agent tools→supabase (RLS auto-scopes).
- **Phase 4 — Cutover**: run ETL, flip env, **re-run the security audit against the RLS policies**, decommission Mongo.

## 9. Effort & risk
- **Effort:** comparable to the MERN→Next migration we just did — a multi-phase, multi-day effort. Phase 1 (auth) and Phase 6/RLS are the riskiest.
- **Top risks:** (a) an RLS policy gap = data leak → mitigate with a per-role test matrix + re-audit; (b) auth cutover breaks login → build on a branch, test before flip; (c) FK/id mapping in ETL; (d) a two-system window.
- **Mitigation:** do it phased on a branch, keep Mongo running until Phase 4 passes, re-audit security before decommission.

## 10. Decisions needed before starting
1. **Separate Supabase project for X7** (strongly recommended — don't co-mingle with BolivAI's multi-tenant data), or shared?
2. **Migrate existing data or start fresh?** (Users are already wiped; how much other data matters?)
3. **Keep API-route structure + Supabase client** (recommended, smallest delta) vs. go PostgREST/RLS-direct from the client?
4. **Timing:** do this now, or ship X7 on Atlas first and migrate later?

## 11. Recommendation
Worthwhile for long-term BolivAI alignment and the security/auth wins — but it's a second large migration.
Do it **phased on a branch**, auth first, RLS treated as security-critical with a fresh audit, Mongo kept live until cutover. If shipping X7 soon matters more than stack unification, staying on Atlas now and migrating post-launch is a perfectly defensible call.
