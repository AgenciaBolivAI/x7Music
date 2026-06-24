import { createClient } from '@/lib/supabase/server';
import { requireAdmin, getAuth } from '@/lib/auth';
import { uploadToBlob, deleteBlob } from '@/lib/blob';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

const STREAMING_KEYS = ['spotify', 'appleMusic', 'youtube', 'amazonMusic', 'tidal'] as const;

export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const sb = createClient();
  // Drafts are admin-only; the public can only fetch a published release.
  const wantPreview = new URL(req.url).searchParams.get('preview') === 'true';
  const isAdmin = wantPreview && (await getAuth())?.role === 'admin';
  let q = sb.from('releases').select('*').eq('id', params.id);
  if (!isAdmin) q = q.eq('is_published', true);
  const { data, error } = await q.maybeSingle();
  if (error) return fail(error.message, 500);
  if (!data) return fail('Release not found', 404);
  return ok({ release: toCamel(data) });
});

export const PUT = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();

  const form = await req.formData();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};
  const setStr = (col: string, key: string) => { const v = form.get(key); if (typeof v === 'string') updates[col] = v; };
  setStr('title', 'title');
  setStr('artist', 'artist');
  setStr('type', 'type');
  setStr('description', 'description');
  if (form.get('releaseDate')) updates.release_date = new Date(String(form.get('releaseDate'))).toISOString();
  if (form.has('isFeatured')) updates.is_featured = String(form.get('isFeatured')) === 'true';
  if (form.has('isPublished')) updates.is_published = String(form.get('isPublished')) === 'true';

  const streamingLinks: Record<string, string> = {};
  let hasLinks = false;
  for (const k of STREAMING_KEYS) {
    const v = form.get(`streamingLinks.${k}`);
    if (typeof v === 'string') { streamingLinks[k] = v; hasLinks = true; }
  }
  if (hasLinks) updates.streaming_links = streamingLinks;

  const file = form.get('coverArt') as File | null;
  if (file) {
    const { data: old } = await sb.from('releases').select('cover_art_url').eq('id', params.id).maybeSingle();
    if (old?.cover_art_url) await deleteBlob(old.cover_art_url);
    updates.cover_art_url = (await uploadToBlob(file, 'releases')).url;
  }

  const { data, error } = await sb.from('releases').update(updates).eq('id', params.id).select('*').maybeSingle();
  if (error) return fail(error.message, 400);
  if (!data) return fail('Release not found', 404);
  return ok({ release: toCamel(data) });
});

export const DELETE = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();
  const { data } = await sb.from('releases').select('cover_art_url').eq('id', params.id).maybeSingle();
  await sb.from('releases').delete().eq('id', params.id);
  if (data?.cover_art_url) await deleteBlob(data.cover_art_url);
  return ok({ message: 'Release deleted' });
});

export const dynamic = 'force-dynamic';
