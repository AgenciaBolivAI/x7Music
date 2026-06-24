import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { uploadToBlob, deleteBlob } from '@/lib/blob';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

const STREAMING_KEYS = ['spotify', 'appleMusic', 'youtube', 'amazonMusic', 'tidal'] as const;
const SOCIAL_KEYS = ['instagram', 'facebook', 'tiktok', 'website'] as const;

// PUT /api/artists/:id — admin, update artist (image upload → 'artists')
export const PUT = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();

  const form = await req.formData();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};
  const setStr = (col: string, key: string) => { const v = form.get(key); if (typeof v === 'string') updates[col] = v; };
  setStr('name', 'name');
  setStr('slug', 'slug');
  setStr('tagline', 'tagline');
  setStr('bio', 'bio');
  setStr('featured_video_url', 'featuredVideoUrl');
  setStr('spotify_embed_url', 'spotifyEmbedUrl');
  setStr('legal_name', 'legalName');
  setStr('stage_name', 'stageName');
  setStr('address', 'address');
  setStr('phone', 'phone');
  setStr('country', 'country');
  setStr('pro', 'pro');
  setStr('ipi_number', 'ipiNumber');
  setStr('publisher_name', 'publisherName');
  setStr('publisher_ipi', 'publisherIpi');
  setStr('contact_email', 'contactEmail');
  if (form.has('isFeatured')) updates.is_featured = String(form.get('isFeatured')) === 'true';
  if (form.has('isPublished')) updates.is_published = String(form.get('isPublished')) === 'true';
  if (form.has('order')) updates.sort_order = Number(form.get('order'));

  const streamingLinks: Record<string, string> = {};
  let hasStreaming = false;
  for (const k of STREAMING_KEYS) {
    const v = form.get(`streamingLinks.${k}`);
    if (typeof v === 'string') { streamingLinks[k] = v; hasStreaming = true; }
  }
  if (hasStreaming) updates.streaming_links = streamingLinks;

  const socialLinks: Record<string, string> = {};
  let hasSocial = false;
  for (const k of SOCIAL_KEYS) {
    const v = form.get(`socialLinks.${k}`);
    if (typeof v === 'string') { socialLinks[k] = v; hasSocial = true; }
  }
  if (hasSocial) updates.social_links = socialLinks;

  const file = form.get('image') as File | null;
  if (file) {
    const { data: old } = await sb.from('artists').select('image_url').eq('id', params.id).maybeSingle();
    if (old?.image_url) await deleteBlob(old.image_url);
    updates.image_url = (await uploadToBlob(file, 'artists')).url;
  }

  const { data, error } = await sb.from('artists').update(updates).eq('id', params.id).select('*').maybeSingle();
  if (error) return fail(error.message, 400);
  if (!data) return fail('Artist not found', 404);
  return ok({ artist: toCamel(data) });
});

// DELETE /api/artists/:id — admin, delete artist
export const DELETE = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();
  const { data } = await sb.from('artists').select('image_url').eq('id', params.id).maybeSingle();
  await sb.from('artists').delete().eq('id', params.id);
  if (data?.image_url) await deleteBlob(data.image_url);
  return ok({ message: 'Artist deleted' });
});

export const dynamic = 'force-dynamic';
