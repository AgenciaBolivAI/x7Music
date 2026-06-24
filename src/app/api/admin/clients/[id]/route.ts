import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

const BOOKING_COLS =
  'id, scheduled_at, status, payment_status, total_amount, created_at, service:services(title,duration,price)';

// GET /api/admin/clients/:id — admin, client detail
export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();

  // profiles has no password fields, so a plain select is safe.
  const { data: client, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();
  if (error) return fail(error.message, 500);
  if (!client) return fail('Client not found', 404);

  const [bookings, catalogCount, docCount] = await Promise.all([
    sb.from('bookings').select(BOOKING_COLS).eq('client_id', params.id).order('scheduled_at', { ascending: false }).limit(10),
    sb.from('catalog_entries').select('*', { count: 'exact', head: true }).eq('client_id', params.id),
    sb.from('documents').select('*', { count: 'exact', head: true }).eq('client_id', params.id),
  ]);

  const firstError = bookings.error || catalogCount.error || docCount.error;
  if (firstError) return fail(firstError.message, 500);

  return ok({
    client: toCamel(client),
    bookings: toCamel(bookings.data ?? []),
    catalogCount: catalogCount.count ?? 0,
    docCount: docCount.count ?? 0,
  });
});

// PUT /api/admin/clients/:id — admin, update client
export const PUT = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();

  const body = await req.json().catch(() => ({}));
  const allowed: Record<string, string> = {
    firstName: 'first_name',
    lastName: 'last_name',
    phone: 'phone',
    company: 'company',
    isActive: 'is_active',
  };
  const updates: Record<string, unknown> = {};
  for (const [key, col] of Object.entries(allowed)) {
    if (body[key] !== undefined) updates[col] = body[key];
  }

  const { data: client, error } = await sb
    .from('profiles')
    .update(updates)
    .eq('id', params.id)
    .select('*')
    .maybeSingle();
  if (error) return fail(error.message, 400);
  if (!client) return fail('Client not found', 404);
  return ok({ client: toCamel(client) });
});

export const dynamic = "force-dynamic";
