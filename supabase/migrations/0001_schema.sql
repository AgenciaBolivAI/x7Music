-- X7 Music — Supabase schema (Phase 0). Run in the SQL Editor.
-- Mirrors the Mongoose models; field names are snake_case. User rows live in
-- auth.users; app profile data lives in public.profiles (1:1).

-- ── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists pgcrypto;   -- gen_random_uuid(), gen_random_bytes()
create extension if not exists vector;      -- pgvector for the company brain

-- ── Enums ────────────────────────────────────────────────────────────────────
create type user_role         as enum ('client', 'admin');
create type booking_status     as enum ('pending', 'confirmed', 'completed', 'cancelled');
create type payment_status     as enum ('unpaid', 'paid', 'waived');
create type invoice_status     as enum ('draft', 'sent', 'paid', 'void');
create type document_type      as enum ('invoice', 'contract', 'report', 'receipt', 'other');
create type message_status     as enum ('unread', 'read', 'replied');
create type catalog_type       as enum ('song', 'album', 'ep', 'single');
create type catalog_status     as enum ('pending', 'in_progress', 'registered', 'issue');
create type release_type       as enum ('single', 'ep', 'album');
create type event_type         as enum ('spotlight', 'worship', 'pinstage', 'meeting', 'other');
create type sub_language       as enum ('en', 'es');
create type sub_source         as enum ('footer', 'contact', 'admin', 'resource');
create type campaign_audience  as enum ('all', 'en', 'es');
create type campaign_status    as enum ('sent', 'partial', 'failed');
create type brain_source_type  as enum ('knowledge', 'faq', 'decision', 'policy', 'music-business');
create type brain_visibility   as enum ('public', 'internal');

-- ── updated_at helper ────────────────────────────────────────────────────────
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ── Profiles (1:1 with auth.users) ───────────────────────────────────────────
create table public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  first_name         text not null default '',
  last_name          text not null default '',
  email              text,
  role               user_role not null default 'client',
  phone              text,
  company            text,
  avatar_url         text,
  is_active          boolean not null default true,
  stripe_customer_id text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

-- Create a profile automatically when a new auth user signs up.
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'first_name', ''),
          coalesce(new.raw_user_meta_data->>'last_name', ''))
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin check used throughout RLS (security definer: reads profiles regardless of RLS).
create or replace function public.is_admin() returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.is_active);
$$;

-- ── Services ─────────────────────────────────────────────────────────────────
create table public.services (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  slug        text not null unique,
  description text not null,
  duration    integer not null,        -- minutes
  price       integer not null default 0, -- cents
  is_free     boolean not null default false,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_services_updated before update on public.services for each row execute function public.set_updated_at();

-- ── Availability ─────────────────────────────────────────────────────────────
create table public.availability (
  id             uuid primary key default gen_random_uuid(),
  day_of_week    integer,             -- 0..6, null for date-specific records
  start_time     text not null default '09:00',
  end_time       text not null default '17:00',
  is_blocked     boolean not null default false,
  specific_date  date,
  buffer_minutes integer not null default 15,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger trg_availability_updated before update on public.availability for each row execute function public.set_updated_at();

-- ── Bookings ─────────────────────────────────────────────────────────────────
create table public.bookings (
  id                         uuid primary key default gen_random_uuid(),
  client_id                  uuid not null references public.profiles(id) on delete cascade,
  service_id                 uuid references public.services(id) on delete set null,
  scheduled_at               timestamptz not null,
  duration_minutes           integer not null,
  status                     booking_status not null default 'pending',
  notes                      text default '',
  admin_notes                text default '',
  total_amount               integer not null default 0, -- cents
  payment_status             payment_status not null default 'unpaid',
  stripe_checkout_session_id text,
  stripe_payment_intent_id   text,
  invoice_id                 uuid,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);
create index on public.bookings (client_id);
create index on public.bookings (scheduled_at);
create trigger trg_bookings_updated before update on public.bookings for each row execute function public.set_updated_at();

-- ── Invoices ─────────────────────────────────────────────────────────────────
create table public.invoices (
  id                       uuid primary key default gen_random_uuid(),
  invoice_number           text not null unique,
  client_id                uuid not null references public.profiles(id) on delete cascade,
  booking_id               uuid references public.bookings(id) on delete set null,
  line_items               jsonb not null default '[]',
  subtotal                 integer not null,
  tax                      integer not null default 0,
  total                    integer not null,
  status                   invoice_status not null default 'draft',
  paid_at                  timestamptz,
  stripe_payment_intent_id text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index on public.invoices (client_id);
create trigger trg_invoices_updated before update on public.invoices for each row execute function public.set_updated_at();

-- bookings.invoice_id → invoices (added after invoices exists)
alter table public.bookings add constraint bookings_invoice_fk
  foreign key (invoice_id) references public.invoices(id) on delete set null;

-- ── Documents ────────────────────────────────────────────────────────────────
create table public.documents (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.profiles(id) on delete cascade,
  booking_id  uuid references public.bookings(id) on delete set null,
  title       text not null,
  type        document_type not null default 'other',
  file_url    text not null,
  file_size   integer,
  uploaded_by text not null default 'admin', -- 'admin' | 'client'
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on public.documents (client_id);
create trigger trg_documents_updated before update on public.documents for each row execute function public.set_updated_at();

-- ── Messages (contact form) ──────────────────────────────────────────────────
create table public.messages (
  id           uuid primary key default gen_random_uuid(),
  sender_name  text not null,
  sender_email text not null,
  client_id    uuid references public.profiles(id) on delete set null,
  subject      text not null,
  body         text not null,
  status       message_status not null default 'unread',
  admin_reply  text,
  replied_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_messages_updated before update on public.messages for each row execute function public.set_updated_at();

-- ── Catalog entries ──────────────────────────────────────────────────────────
create table public.catalog_entries (
  id                     uuid primary key default gen_random_uuid(),
  client_id              uuid not null references public.profiles(id) on delete cascade,
  title                  text not null,
  type                   catalog_type not null,
  isrc                   text,
  iswc                   text,
  upc                    text,
  registered_pro         text,
  registered_mlc         boolean not null default false,
  distribution_platforms text[] not null default '{}',
  release_date           date,
  status                 catalog_status not null default 'pending',
  status_notes           text,
  cover_art_url          text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index on public.catalog_entries (client_id);
create trigger trg_catalog_updated before update on public.catalog_entries for each row execute function public.set_updated_at();

-- ── Blog posts (CHECKZONE) ───────────────────────────────────────────────────
create table public.blog_posts (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text not null unique,
  excerpt         text not null,
  content         text not null,
  cover_image_url text,
  author          text not null default 'Steven Pantojas',
  tags            text[] not null default '{}',
  category        text,
  is_published    boolean not null default false,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_blog_updated before update on public.blog_posts for each row execute function public.set_updated_at();

-- ── Releases ─────────────────────────────────────────────────────────────────
create table public.releases (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  artist         text not null,
  type           release_type not null,
  release_date   date not null,
  cover_art_url  text,
  streaming_links jsonb not null default '{}',
  description    text,
  is_featured    boolean not null default false,
  is_published   boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger trg_releases_updated before update on public.releases for each row execute function public.set_updated_at();

-- ── Events ───────────────────────────────────────────────────────────────────
create table public.events (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  slug             text not null unique,
  type             event_type not null default 'other',
  description      text not null,
  long_description text,
  date             timestamptz not null,
  end_date         timestamptz,
  location         text,
  virtual_link     text,
  image_url        text,
  ticket_link      text,
  is_featured      boolean not null default false,
  is_published     boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger trg_events_updated before update on public.events for each row execute function public.set_updated_at();

-- ── Artists ──────────────────────────────────────────────────────────────────
create table public.artists (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text not null unique,
  tagline           text,
  bio               text,
  image_url         text,
  streaming_links   jsonb not null default '{}',
  social_links      jsonb not null default '{}',
  featured_video_url text,
  spotify_embed_url text,
  -- publishing / PRO (PII — gated in RLS / API projections)
  legal_name        text,
  pro               text,
  ipi_number        text,
  publisher_name    text,
  publisher_ipi     text,
  contact_email     text,
  is_featured       boolean not null default false,
  is_published      boolean not null default false,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger trg_artists_updated before update on public.artists for each row execute function public.set_updated_at();

-- ── Subscribers ──────────────────────────────────────────────────────────────
create table public.subscribers (
  id                uuid primary key default gen_random_uuid(),
  email             text not null unique,
  name              text,
  language          sub_language not null default 'es',
  source            sub_source not null default 'footer',
  is_active         boolean not null default true,
  unsubscribe_token text not null default encode(gen_random_bytes(24), 'hex'),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index on public.subscribers (unsubscribe_token);
create trigger trg_subscribers_updated before update on public.subscribers for each row execute function public.set_updated_at();

-- ── Campaigns (newsletter broadcasts) ────────────────────────────────────────
create table public.campaigns (
  id              uuid primary key default gen_random_uuid(),
  subject         text not null,
  body            text not null,
  cta_label       text,
  cta_url         text,
  audience        campaign_audience not null default 'all',
  recipient_count integer not null default 0,
  sent_count      integer not null default 0,
  failed_count    integer not null default 0,
  status          campaign_status not null default 'sent',
  sent_by         uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_campaigns_updated before update on public.campaigns for each row execute function public.set_updated_at();

-- ── Split sheets ─────────────────────────────────────────────────────────────
create table public.split_sheets (
  id         uuid primary key default gen_random_uuid(),
  song_title text not null,
  work_date  date,
  notes      text,
  writers    jsonb not null default '[]',  -- [{name, role, pro, ipi, publisher, percentage, artistId?}]
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_splits_updated before update on public.split_sheets for each row execute function public.set_updated_at();

-- ── Resources (free downloads / lead magnets) ────────────────────────────────
create table public.resources (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text not null unique,
  description     text,
  file_url        text not null,
  cover_image_url text,
  category        text,
  is_active       boolean not null default true,
  download_count  integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_resources_updated before update on public.resources for each row execute function public.set_updated_at();

-- ── Company brain (RAG) ──────────────────────────────────────────────────────
create table public.brain_chunks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  content     text not null,
  source_type brain_source_type not null default 'knowledge',
  visibility  brain_visibility not null default 'public',
  tags        text[] not null default '{}',
  embedding   vector(1536),               -- text-embedding-3-small
  is_active   boolean not null default true,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on public.brain_chunks using hnsw (embedding vector_cosine_ops);
create trigger trg_brain_updated before update on public.brain_chunks for each row execute function public.set_updated_at();

-- ── Brain similarity search RPC (visibility-aware) ───────────────────────────
create or replace function public.search_brain(
  query_embedding vector(1536),
  match_count integer default 5,
  include_internal boolean default false
)
returns table (id uuid, title text, content text, source_type brain_source_type, similarity float)
language sql stable as $$
  select b.id, b.title, b.content, b.source_type,
         1 - (b.embedding <=> query_embedding) as similarity
  from public.brain_chunks b
  where b.is_active
    and b.embedding is not null
    -- Defense-in-depth (in addition to the brain_read RLS policy): internal chunks
    -- require BOTH the include_internal flag AND an admin caller.
    and (b.visibility = 'public' or (include_internal and public.is_admin()))
  order by b.embedding <=> query_embedding
  limit match_count;
$$;
