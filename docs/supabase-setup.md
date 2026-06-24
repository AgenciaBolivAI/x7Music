# X7 — Supabase setup & migration runbook

X7 runs on its **own** Supabase project (separate from the BolivAI platform). Follow this once.

## 1. Create the project
1. supabase.com → New project (name e.g. `x7music`, choose a region near your users).
2. Save the database password.
3. **Project Settings → API** → copy into `web/.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` ← Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` ← `anon` public key
   - `SUPABASE_SERVICE_ROLE_KEY` ← `service_role` secret key (server-only; never ship to the browser)

## 2. Run the migrations (in order)
Supabase Dashboard → **SQL Editor** → paste & run each file from `web/supabase/migrations/`:
1. `0001_schema.sql` — extensions (pgvector), enums, tables, profiles + new-user trigger
2. `0002_rls.sql` — Row-Level Security policies (security-critical)

(Or with the Supabase CLI: `supabase link` then `supabase db push`.)

## 3. Seed baseline data + first admin
With `web/.env.local` filled in (incl. `SUPABASE_SERVICE_ROLE_KEY`, and `OPENAI_API_KEY` for the brain):
```powershell
cd web
npm run seed:supabase                       # services, artists, availability, company brain
$env:ADMIN_EMAIL="stevenpantojas@x7musicgroup.com"; $env:ADMIN_PASSWORD="YourStrongPass123"; npm run create-admin:supabase
```
`create-admin:supabase` creates the Supabase Auth user (email pre-confirmed) and sets their
`profiles.role = 'admin'`. Re-running it just re-promotes / resets the password. Then log in at `/login`.

(Manual alternative: Authentication → Users → Add user, then in SQL Editor
`update public.profiles set role='admin' where id=(select id from auth.users where email='…');`)

## 4. Storage
File uploads stay on **Vercel Blob** (unchanged) — Supabase Storage is not used.

## Notes
- Anon key is safe in the browser; it only grants what RLS allows. The service-role key bypasses RLS and must stay server-side.
- After cutover, the old Mongo `MONGODB_URI` and custom `JWT_SECRET` are no longer used.
