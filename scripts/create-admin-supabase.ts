/**
 * Create (or promote) the X7 admin in Supabase Auth.
 *   cd web
 *   $env:ADMIN_EMAIL="stevenpantojas@x7musicgroup.com"; $env:ADMIN_PASSWORD="YourStrongPass123"; npm run create-admin:supabase
 * Loads web/.env.local (needs SUPABASE_SERVICE_ROLE_KEY). Idempotent: if the user
 * already exists it just sets their profile role to 'admin'.
 */
import './ws-polyfill';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const firstName = process.env.ADMIN_FIRST_NAME || 'Steven';
const lastName = process.env.ADMIN_LAST_NAME || 'Pantojas';

function die(m: string): never { console.error(`\n✖ ${m}\n`); process.exit(1); }
if (!url || !key) die('Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in web/.env.local');
if (!email || !password) die('Set ADMIN_EMAIL and ADMIN_PASSWORD env vars.');
if (password.length < 8) die('ADMIN_PASSWORD must be at least 8 characters.');

const sb = createClient(url, key, { auth: { persistSession: false } });

async function run() {
  // Try to create; if the email already exists, find them instead.
  let userId: string | undefined;
  const created = await sb.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  });
  if (created.error) {
    console.log(`User may already exist (${created.error.message}); locating…`);
    // paginate to find the user by email
    const { data } = await sb.auth.admin.listUsers();
    userId = data.users.find((u) => u.email?.toLowerCase() === email!.toLowerCase())?.id;
    if (!userId) die('Could not create or find that user.');
    if (password) await sb.auth.admin.updateUserById(userId, { password });
  } else {
    userId = created.data.user?.id;
  }
  if (!userId) die('No user id resolved.');

  const { error } = await sb.from('profiles')
    .update({ role: 'admin', is_active: true, first_name: firstName, last_name: lastName })
    .eq('id', userId);
  if (error) die(`Profile update failed: ${error.message}`);

  console.log(`\n✅ Admin ready: ${email} (role: admin). Log in at /login.\n`);
}
run().catch((e) => { console.error(e); process.exit(1); });
