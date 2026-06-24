import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
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

// GET /api/services/:slug  — public, param treated as slug
export const GET = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const sb = createClient();
  const { data, error } = await sb
    .from('services')
    .select('*')
    .eq('slug', params.id)
    .eq('is_active', true)
    .maybeSingle();
  if (error) return fail(error.message, 500);
  if (!data) return fail('Service not found', 404);
  return ok({ service: toCamel(data) });
});

// PUT /api/services/:id  (admin)
export const PUT = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => ({}));
  const parsed = serviceSchema.partial().safeParse(body);
  if (!parsed.success) {
    return fail('Invalid data', 400, { errors: parsed.error.flatten() });
  }
  const { isActive, order, ...rest } = parsed.data;
  const updates: Record<string, unknown> = { ...rest };
  if (isActive !== undefined) updates.is_active = isActive;
  if (order !== undefined) updates.sort_order = order;
  if (parsed.data.price !== undefined) updates.is_free = parsed.data.price === 0;

  const sb = createClient();
  const { data, error } = await sb.from('services').update(updates).eq('id', params.id).select('*').maybeSingle();
  if (error) return fail(error.message, 400);
  if (!data) return fail('Service not found', 404);
  return ok({ service: toCamel(data) });
});

// DELETE /api/services/:id  (admin) — soft delete
export const DELETE = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const sb = createClient();
  const { data, error } = await sb.from('services').update({ is_active: false }).eq('id', params.id).select('id').maybeSingle();
  if (error) return fail(error.message, 400);
  if (!data) return fail('Service not found', 404);
  return ok({ message: 'Service deactivated' });
});

export const dynamic = "force-dynamic";
