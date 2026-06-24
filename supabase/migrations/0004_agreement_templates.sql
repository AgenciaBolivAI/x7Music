-- X7 Music — Editable document templates for the agreements engine.
-- Templates hold the FULL legal body (verbatim) with placeholders ({{titulo}},
-- {{TABLA}}, {{FIRMAS}}, …). An agreement snapshots the template body at creation
-- so editing a template later never alters already-issued documents. Idempotent.

create table if not exists public.agreement_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  category    agreement_type not null default 'split_sheet',  -- maps to agreements.type
  description text,
  body        text not null,                 -- full document body with placeholders/markup
  fields      jsonb not null default '[]',   -- [{key,label}] meta inputs shown in the builder
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_agreement_templates_updated on public.agreement_templates;
create trigger trg_agreement_templates_updated before update on public.agreement_templates
  for each row execute function public.set_updated_at();

-- Agreement instances reference the template + keep a frozen copy of its body.
alter table public.agreements
  add column if not exists template_id uuid references public.agreement_templates(id) on delete set null,
  add column if not exists body text;

-- Signers gain phone + address (rendered in the signature blocks, e.g. FANTOMMENACE style).
alter table public.agreement_signers
  add column if not exists phone   text,
  add column if not exists address text;

-- ── RLS — admin-only (templates are internal config) ──────────────────────────
alter table public.agreement_templates enable row level security;
drop policy if exists agreement_templates_admin on public.agreement_templates;
create policy agreement_templates_admin on public.agreement_templates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
