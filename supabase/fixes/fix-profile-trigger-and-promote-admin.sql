-- One-off fix applied to the live DB after 0001/0002 were run.
-- 1) The profile-protection trigger must NOT clobber privileged columns when the
--    change comes from a trusted backend (service-role key) or the DB owner —
--    only untrusted authenticated/anon roles get clamped. (This is folded into
--    0002_rls.sql for fresh installs.)
create or replace function public.protect_profile_privileged() returns trigger language plpgsql as $$
begin
  if not (public.is_admin() or current_user in ('service_role', 'supabase_admin', 'postgres')) then
    new.role := old.role;
    new.is_active := old.is_active;
  end if;
  return new;
end; $$;

-- 2) Promote the X7 admin (the old trigger had reverted it to 'client').
update public.profiles p
set role = 'admin', is_active = true
from auth.users u
where p.id = u.id and lower(u.email) = lower('stevenpantojas@x7musicgroup.com');
