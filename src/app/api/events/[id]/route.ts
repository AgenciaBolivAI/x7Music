import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { uploadToBlob, deleteBlob } from '@/lib/blob';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

// GET /api/events/:id — public, fetch a published event by slug.
export const GET = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const sb = createClient();
  const { data, error } = await sb
    .from('events')
    .select('*')
    .eq('slug', params.id)
    .eq('is_published', true)
    .maybeSingle();
  if (error) return fail(error.message, 500);
  if (!data) return fail('Event not found', 404);
  return ok({ event: toCamel(data) });
});

// PUT /api/events/:id — admin, update event by id (image upload → 'events')
export const PUT = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();

  const form = await req.formData();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};
  const setStr = (col: string, key: string) => { const v = form.get(key); if (typeof v === 'string') updates[col] = v; };
  setStr('title', 'title');
  setStr('slug', 'slug');
  setStr('type', 'type');
  setStr('description', 'description');
  setStr('long_description', 'longDescription');
  setStr('location', 'location');
  setStr('virtual_link', 'virtualLink');
  setStr('ticket_link', 'ticketLink');
  if (form.get('date')) updates.date = new Date(String(form.get('date'))).toISOString();
  if (form.get('endDate')) updates.end_date = new Date(String(form.get('endDate'))).toISOString();
  if (form.has('isFeatured')) updates.is_featured = String(form.get('isFeatured')) === 'true';
  if (form.has('isPublished')) updates.is_published = String(form.get('isPublished')) === 'true';

  const file = form.get('image') as File | null;
  if (file) {
    const { data: old } = await sb.from('events').select('image_url').eq('id', params.id).maybeSingle();
    if (old?.image_url) await deleteBlob(old.image_url);
    updates.image_url = (await uploadToBlob(file, 'events')).url;
  }

  const { data, error } = await sb.from('events').update(updates).eq('id', params.id).select('*').maybeSingle();
  if (error) return fail(error.message, 400);
  if (!data) return fail('Event not found', 404);
  return ok({ event: toCamel(data) });
});

// DELETE /api/events/:id — admin, delete event by id
export const DELETE = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();
  const { data } = await sb.from('events').select('image_url').eq('id', params.id).maybeSingle();
  await sb.from('events').delete().eq('id', params.id);
  if (data?.image_url) await deleteBlob(data.image_url);
  return ok({ message: 'Event deleted' });
});

export const dynamic = 'force-dynamic';
