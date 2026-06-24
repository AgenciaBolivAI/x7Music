import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { uploadToBlob } from '@/lib/blob';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 100);

// GET /api/admin/resources — admin list with file_url + lead/download counts.
export const GET = handler(async () => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();
  const { data, error } = await sb
    .from('resources')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return fail(error.message, 500);
  return ok({ resources: toCamel(data ?? []) });
});

// POST /api/admin/resources — create a guide (multipart: file = PDF/doc, + cover image).
export const POST = handler(async (req: Request) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();

  const form = await req.formData();
  const title = String(form.get('title') ?? '').trim();
  const description = String(form.get('description') ?? '').trim();
  const category = String(form.get('category') ?? '').trim();
  const file = form.get('file') as File | null;
  const cover = form.get('cover') as File | null;
  if (!title || !file) return fail('Title and a file are required.', 400);

  const { url } = await uploadToBlob(file, 'resources');
  let coverImageUrl: string | undefined;
  if (cover) coverImageUrl = (await uploadToBlob(cover, 'resources')).url;

  // Ensure a unique slug.
  let slug = slugify(title) || `guide-${Date.now()}`;
  const { data: existing } = await sb.from('resources').select('id').eq('slug', slug).maybeSingle();
  if (existing) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  const row = {
    title,
    description,
    category,
    slug,
    file_url: url,
    cover_image_url: coverImageUrl ?? null,
    is_active: true,
  };
  const { data, error } = await sb.from('resources').insert(row).select('*').maybeSingle();
  if (error) return fail(error.message, 400);
  return ok({ resource: toCamel(data) }, 201);
});

export const dynamic = 'force-dynamic';
