import { createClient } from '@/lib/supabase/server';
import { requireAdmin, getAuth } from '@/lib/auth';
import { uploadToBlob } from '@/lib/blob';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 80);

export const GET = handler(async (req: Request) => {
  const sb = createClient();
  const wantAll = new URL(req.url).searchParams.get('all') === 'true';
  const isAdmin = wantAll && (await getAuth())?.role === 'admin';
  let q = sb.from('events').select('*').order('date', { ascending: true });
  if (!isAdmin) q = q.eq('is_published', true).gte('date', new Date().toISOString());
  const { data, error } = await q;
  if (error) return fail(error.message, 500);
  return ok({ events: toCamel(data ?? []) });
});

export const POST = handler(async (req: Request) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const form = await req.formData();

  const file = form.get('image') as File | null;
  let imageUrl: string | undefined;
  if (file) imageUrl = (await uploadToBlob(file, 'events')).url;

  const str = (key: string) => {
    const v = form.get(key);
    return typeof v === 'string' && v ? v : null;
  };

  const title = String(form.get('title') ?? '');
  const slug = str('slug') ?? slugify(title);

  const row = {
    title,
    slug,
    type: String(form.get('type') ?? 'other'),
    description: String(form.get('description') ?? ''),
    long_description: str('longDescription'),
    date: new Date(String(form.get('date'))).toISOString(),
    end_date: form.get('endDate') ? new Date(String(form.get('endDate'))).toISOString() : null,
    location: str('location'),
    virtual_link: str('virtualLink'),
    image_url: imageUrl ?? null,
    ticket_link: str('ticketLink'),
    is_featured: String(form.get('isFeatured')) === 'true',
    is_published: String(form.get('isPublished')) === 'true',
  };

  const sb = createClient();
  const { data, error } = await sb.from('events').insert(row).select('*').maybeSingle();
  if (error) return fail(error.message, 400);
  return ok({ event: toCamel(data) }, 201);
});

export const dynamic = 'force-dynamic';
