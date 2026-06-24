import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, zodFail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  category: z.enum(['split_sheet', 'distribution_agreement']).optional(),
  description: z.string().max(500).nullable().optional(),
  body: z.string().min(1).optional(),
  fields: z.array(z.object({ key: z.string().min(1).max(40), label: z.string().min(1).max(120), default: z.string().max(200).optional() })).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const GET = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { data, error } = await createClient().from('agreement_templates').select('*').eq('id', params.id).maybeSingle();
  if (error) return fail(error.message, 500);
  if (!data) return fail('Template not found', 404);
  return ok({ template: toCamel(data) });
});

export const PATCH = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return zodFail(parsed.error);
  const d = parsed.data;
  const updates: Record<string, unknown> = {};
  if (d.name !== undefined) updates.name = d.name;
  if (d.category !== undefined) updates.category = d.category;
  if (d.description !== undefined) updates.description = d.description;
  if (d.body !== undefined) updates.body = d.body;
  if (d.fields !== undefined) updates.fields = d.fields;
  if (d.isActive !== undefined) updates.is_active = d.isActive;
  if (d.sortOrder !== undefined) updates.sort_order = d.sortOrder;
  if (!Object.keys(updates).length) return fail('No changes', 400);
  const { data, error } = await createClient().from('agreement_templates').update(updates).eq('id', params.id).select('*').maybeSingle();
  if (error) return fail(error.message, 400);
  if (!data) return fail('Template not found', 404);
  return ok({ template: toCamel(data) });
});

export const DELETE = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { error } = await createClient().from('agreement_templates').delete().eq('id', params.id);
  if (error) return fail(error.message, 400);
  return ok({ message: 'Template deleted' });
});

export const dynamic = 'force-dynamic';
