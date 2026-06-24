/**
 * Run a .sql file against the X7 Supabase Postgres DB.
 *   node --env-file=.env.local --import tsx scripts/run-sql.ts <path-to.sql>
 *
 * Reads the connection string from env `SUPABASE_DB_URL` (preferred) or `postgr`.
 * The direct `db.<ref>.supabase.co` host is often unreachable (IPv6-only / new
 * projects), so this falls back to the regional connection pooler, auto-detecting
 * the region by probing each pooler endpoint with the project ref.
 */
import { readFileSync } from 'node:fs';
import { Client, type ClientConfig } from 'pg';

const raw = process.env.SUPABASE_DB_URL || process.env.postgr;
if (!raw) { console.error('No connection string (SUPABASE_DB_URL / postgr) in env'); process.exit(1); }
const file = process.argv[2];
if (!file) { console.error('Usage: run-sql.ts <path-to.sql>'); process.exit(1); }
const sql = readFileSync(file, 'utf8');

const u = new URL(raw);
const password = decodeURIComponent(u.password);
const baseUser = decodeURIComponent(u.username) || 'postgres';
const directHost = u.hostname;
const database = (u.pathname || '/postgres').replace(/^\//, '') || 'postgres';
const refMatch = directHost.match(/(?:^db\.)?([a-z0-9]{16,})\.supabase\.co$/);
const ref = refMatch ? refMatch[1] : null;

const REGIONS = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'ca-central-1', 'sa-east-1',
  'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'eu-central-2', 'eu-north-1',
  'ap-south-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2',
];

async function connect(cfg: ClientConfig, label: string): Promise<Client> {
  const c = new Client({ ...cfg, database, password, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
  await c.connect();
  console.log(`Connected via ${label}`);
  return c;
}

async function getClient(): Promise<Client> {
  try { return await connect({ host: directHost, port: Number(u.port) || 5432, user: baseUser }, `direct ${directHost}`); }
  catch (e: any) { console.log(`  direct ${directHost} unavailable: ${e.code || e.message}`); }

  if (!ref) throw new Error('Could not derive project ref for pooler fallback');
  const pUser = `${baseUser}.${ref}`;
  let sawPasswordFail = false;
  // Probe every region/prefix; a single endpoint password-failing doesn't mean
  // the password is wrong (the tenant can resolve on endpoints that reject it),
  // so keep going and only conclude after exhausting all of them.
  for (const prefix of ['aws-0', 'aws-1']) {
    for (const region of REGIONS) {
      const host = `${prefix}-${region}.pooler.supabase.com`;
      try { return await connect({ host, port: 5432, user: pUser }, `pooler ${host}`); }
      catch (e: any) {
        if ((e.message || '').toLowerCase().includes('password authentication failed')) sawPasswordFail = true;
        // tenant-not-found / unreachable / transient → try the next endpoint
      }
    }
  }
  throw new Error(
    sawPasswordFail
      ? 'Connected to the pooler but the DB password was rejected on every matching endpoint — check `sps` / SUPABASE_DB_URL.'
      : 'Could not connect via any pooler region.',
  );
}

(async () => {
  const c = await getClient();
  try {
    console.log(`Executing ${file} (${sql.length} chars)…`);
    await c.query(sql);
    console.log('✓ SQL executed.');
  } finally {
    await c.end();
  }
})().catch((e) => { console.error('\n✖', e.message); process.exit(1); });
