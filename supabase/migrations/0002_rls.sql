-- X7 Music — Row-Level Security (Phase 0). Run AFTER 0001_schema.sql.
-- Model: anon sees only published/public content; clients see only their own
-- private records; admins see all; all cross-user/system writes go through the
-- service-role key (which bypasses RLS) in trusted server code.
--
-- NOTE on columns: RLS is row-level, not column-level. Admin-only fields that a
-- client legitimately owns the ROW for (bookings.admin_notes, documents.file_url,
-- artists PRO/PII) are kept out of client responses in the API layer via explicit
-- column SELECTs — exactly as the current code already does.

-- Prevent clients from escalating their own role / reactivating themselves.
-- Trusted backends (service-role key) and the DB owner are exempt, since all
-- system/admin writes legitimately go through the service role; only untrusted
-- authenticated/anon callers get their privileged columns clamped.
create or replace function public.protect_profile_privileged() returns trigger language plpgsql as $$
begin
  if not (public.is_admin() or current_user in ('service_role', 'supabase_admin', 'postgres')) then
    new.role := old.role;
    new.is_active := old.is_active;
  end if;
  return new;
end; $$;
create trigger trg_profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_privileged();

-- Enable RLS everywhere.
alter table public.profiles        enable row level security;
alter table public.services        enable row level security;
alter table public.availability    enable row level security;
alter table public.bookings        enable row level security;
alter table public.invoices        enable row level security;
alter table public.documents       enable row level security;
alter table public.messages        enable row level security;
alter table public.catalog_entries enable row level security;
alter table public.blog_posts      enable row level security;
alter table public.releases        enable row level security;
alter table public.events          enable row level security;
alter table public.artists         enable row level security;
alter table public.subscribers     enable row level security;
alter table public.campaigns       enable row level security;
alter table public.split_sheets    enable row level security;
alter table public.resources       enable row level security;
alter table public.brain_chunks    enable row level security;

-- ── Profiles ─────────────────────────────────────────────────────────────────
create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update_self_or_admin on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
-- (inserts happen via the on_auth_user_created trigger; admin reads-all via is_admin)

-- ── Public content (anon + authenticated read published; admin writes) ───────
-- services
create policy services_read on public.services
  for select to anon, authenticated using (is_active or public.is_admin());
create policy services_admin_write on public.services
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- artists
create policy artists_read on public.artists
  for select to anon, authenticated using (is_published or public.is_admin());
create policy artists_admin_write on public.artists
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- releases
create policy releases_read on public.releases
  for select to anon, authenticated using (is_published or public.is_admin());
create policy releases_admin_write on public.releases
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- events
create policy events_read on public.events
  for select to anon, authenticated using (is_published or public.is_admin());
create policy events_admin_write on public.events
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- blog posts
create policy blog_read on public.blog_posts
  for select to anon, authenticated using (is_published or public.is_admin());
create policy blog_admin_write on public.blog_posts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- resources (public list shows active; downloads/leads handled server-side)
create policy resources_read on public.resources
  for select to anon, authenticated using (is_active or public.is_admin());
create policy resources_admin_write on public.resources
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- availability (schedule is public for the booking calendar; admin writes)
create policy availability_read on public.availability
  for select to anon, authenticated using (true);
create policy availability_admin_write on public.availability
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── Client-owned private data (own rows or admin) ───────────────────────────
-- bookings: client reads/creates own; admin all; updates/deletes admin-only
create policy bookings_select on public.bookings
  for select to authenticated using (client_id = auth.uid() or public.is_admin());
create policy bookings_insert on public.bookings
  for insert to authenticated with check (client_id = auth.uid() or public.is_admin());
create policy bookings_admin_update on public.bookings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy bookings_admin_delete on public.bookings
  for delete to authenticated using (public.is_admin());

-- invoices: read own or admin; writes admin-only (service role for system)
create policy invoices_select on public.invoices
  for select to authenticated using (client_id = auth.uid() or public.is_admin());
create policy invoices_admin_write on public.invoices
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- documents: read own or admin; writes admin-only
create policy documents_select on public.documents
  for select to authenticated using (client_id = auth.uid() or public.is_admin());
create policy documents_admin_write on public.documents
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- catalog: read own or admin; writes admin-only
create policy catalog_select on public.catalog_entries
  for select to authenticated using (client_id = auth.uid() or public.is_admin());
create policy catalog_admin_write on public.catalog_entries
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── Admin-only tables (public mutations go through the service role) ─────────
create policy messages_admin on public.messages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy subscribers_admin on public.subscribers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy campaigns_admin on public.campaigns
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy splits_admin on public.split_sheets
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── Company brain ────────────────────────────────────────────────────────────
-- Read: anyone may read ACTIVE + PUBLIC chunks; admins read everything (incl. internal).
-- The search_brain() RPC runs with invoker rights, so this policy also gates it.
create policy brain_read on public.brain_chunks
  for select to anon, authenticated using ((is_active and visibility = 'public') or public.is_admin());
create policy brain_admin_write on public.brain_chunks
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
