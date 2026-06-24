import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, zodFail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

const templateSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120).optional(),
  category: z.enum(['split_sheet', 'distribution_agreement']).default('split_sheet'),
  description: z.string().max(500).optional(),
  body: z.string().min(1),
  fields: z.array(z.object({ key: z.string().min(1).max(40), label: z.string().min(1).max(120), default: z.string().max(200).optional() })).default([]),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s-]+/g, '-').slice(0, 80) || `tpl-${Date.now()}`;

export const GET = handler(async () => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { data, error } = await createClient()
    .from('agreement_templates')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) return fail(error.message, 500);
  return ok({ templates: toCamel(data ?? []) });
});

export const POST = handler(async (req: Request) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const parsed = templateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return zodFail(parsed.error);
  const d = parsed.data;
  const row = {
    name: d.name,
    slug: d.slug || slugify(d.name),
    category: d.category,
    description: d.description ?? null,
    body: d.body,
    fields: d.fields,
    is_active: d.isActive ?? true,
    sort_order: d.sortOrder ?? 0,
  };
  const { data, error } = await createClient().from('agreement_templates').insert(row).select('*').maybeSingle();
  if (error) return fail(error.message, 400);
  return ok({ template: toCamel(data) }, 201);
});

export const dynamic = 'force-dynamic';
