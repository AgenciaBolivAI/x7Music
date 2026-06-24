import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin, getAuth } from '@/lib/auth';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

const serviceSchema = z.object({
  title:         z.string().min(1).max(100),
  slug:          z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with hyphens'),
  description:   z.string().min(1),
  duration:      z.number().int().min(5).max(480),
  price:         z.number().int().min(0),
  isFree:        z.boolean().optional(),
  isActive:      z.boolean().optional(),
  order:         z.number().int().min(0).optional(),
});

// GET /api/services  — ?all=true for admin to see inactive
export const GET = handler(async (req: Request) => {
  const sb = createClient();
  const { searchParams } = new URL(req.url);
  // ?all=true (show inactive) is admin-only; non-admins silently get active-only.
  const wantAll = searchParams.get('all') === 'true';
  const isAdmin = wantAll && (await getAuth())?.role === 'admin';
  let q = sb.from('services').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true });
  if (!isAdmin) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) return fail(error.message, 500);
  return ok({ services: toCamel(data ?? []) });
});

// POST /api/services  (admin)
export const POST = handler(async (req: Request) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => ({}));
  const parsed = serviceSchema.safeParse(body);
  if (!parsed.success) {
    return fail('Invalid data', 400, { errors: parsed.error.flatten() });
  }
  const { isActive, order, ...rest } = parsed.data;
  const row = {
    ...rest,
    is_free: parsed.data.price === 0,
    ...(isActive !== undefined ? { is_active: isActive } : {}),
    ...(order !== undefined ? { sort_order: order } : {}),
  };

  const sb = createClient();
  const { data, error } = await sb.from('services').insert(row).select('*').maybeSingle();
  if (error) return fail(error.message, 400);
  return ok({ service: toCamel(data) }, 201);
});

export const dynamic = "force-dynamic";
