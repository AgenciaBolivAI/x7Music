-- X7 Music — Agreements & native e-signatures (split sheet + distribution agreement).
-- Adds richer artist-profile fields that feed generated agreements, plus the
-- `agreements` + `agreement_signers` tables backing the generator and the
-- tokenized signing flow. Named `agreements` (NOT `documents`) to avoid the
-- existing client file-delivery `documents` table. Idempotent (safe re-run).

-- ── Artist profile fields (PII — gated like the existing PRO/publishing cols) ──
alter table public.artists
  add column if not exists stage_name text,
  add column if not exists address    text,
  add column if not exists phone       text,
  add column if not exists country     text;

-- Clean up the misnamed table from the first draft of this migration, if present.
drop table if exists public.document_signers cascade;

-- ── Enums ────────────────────────────────────────────────────────────────────
do $$ begin
  create type agreement_type as enum ('split_sheet', 'distribution_agreement');
exception when duplicate_object then null; end $$;
do $$ begin
  create type agreement_status as enum ('draft', 'sent', 'partially_signed', 'completed', 'voided');
exception when duplicate_object then null; end $$;
do $$ begin
  create type signer_status as enum ('pending', 'viewed', 'signed');
exception when duplicate_object then null; end $$;

-- ── Agreements (generated documents) ─────────────────────────────────────────
create table if not exists public.agreements (
  id              uuid primary key default gen_random_uuid(),
  type            agreement_type   not null,
  title           text             not null,
  status          agreement_status not null default 'draft',
  data            jsonb            not null default '{}',  -- type-specific payload (song/ISWC/ISRC/writers or distribution terms)
  file_url        text,                                    -- latest generated draft PDF (private blob)
  signed_file_url text,                                    -- final fully-signed PDF (private blob)
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
drop trigger if exists trg_agreements_updated on public.agreements;
create trigger trg_agreements_updated before update on public.agreements
  for each row execute function public.set_updated_at();

-- ── Agreement signers (one row per predefined signature slot) ────────────────
create table if not exists public.agreement_signers (
  id                uuid primary key default gen_random_uuid(),
  agreement_id      uuid not null references public.agreements(id) on delete cascade,
  artist_id         uuid references public.artists(id) on delete set null,
  name              text not null,
  email             text not null,
  role              text,                                              -- slot label (Writer, Label, Producer…)
  sort_order        integer not null default 0,
  token             text not null unique default encode(gen_random_bytes(24), 'hex'),
  status            signer_status not null default 'pending',
  signature_data    text,        -- base64 PNG of the drawn/typed signature
  signed_name       text,        -- the name the signer typed/attested
  viewed_at         timestamptz,
  signed_at         timestamptz,
  signer_ip         text,
  signer_user_agent text,
  created_at        timestamptz not null default now()
);
create index if not exists agreement_signers_agreement_id_idx on public.agreement_signers(agreement_id);
create index if not exists agreement_signers_token_idx on public.agreement_signers(token);

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Admin-only via the session client. The public signing flow has no logged-in
-- user, so it goes through the service-role key (bypasses RLS) and is gated by
-- the per-signer token in app code — same pattern as the Stripe webhook / brain.
alter table public.agreements        enable row level security;
alter table public.agreement_signers enable row level security;

drop policy if exists agreements_admin on public.agreements;
create policy agreements_admin on public.agreements
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists agreement_signers_admin on public.agreement_signers;
create policy agreement_signers_admin on public.agreement_signers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
