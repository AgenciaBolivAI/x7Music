import { createClient } from '@/lib/supabase/server';
import { requireAdmin, getAuth } from '@/lib/auth';
import { uploadToBlob } from '@/lib/blob';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';
import { PUBLIC_ARTIST_COLUMNS } from '@/lib/artistFields';

const STREAMING_KEYS = ['spotify', 'appleMusic', 'youtube', 'amazonMusic', 'tidal'] as const;
const SOCIAL_KEYS = ['instagram', 'facebook', 'tiktok', 'website'] as const;

// GET /api/artists — public, list artists
export const GET = handler(async (req: Request) => {
  const sb = createClient();
  // ?all=true (includes unpublished artists + their PRO/PII) is admin-only.
  const wantAll = new URL(req.url).searchParams.get('all') === 'true';
  const isAdmin = wantAll && (await getAuth())?.role === 'admin';
  // Non-admins get only the safe columns (no PRO/PII); admins may read everything.
  let q = sb.from('artists').select(isAdmin ? '*' : PUBLIC_ARTIST_COLUMNS)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (!isAdmin) q = q.eq('is_published', true);
  const { data, error } = await q;
  if (error) return fail(error.message, 500);
  return ok({ artists: toCamel(data ?? []) });
});

// POST /api/artists — admin, create artist (image upload → 'artists')
export const POST = handler(async (req: Request) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const form = await req.formData();

  const streamingLinks: Record<string, string> = {};
  for (const k of STREAMING_KEYS) {
    const v = form.get(`streamingLinks.${k}`);
    if (typeof v === 'string') streamingLinks[k] = v;
  }
  const socialLinks: Record<string, string> = {};
  for (const k of SOCIAL_KEYS) {
    const v = form.get(`socialLinks.${k}`);
    if (typeof v === 'string') socialLinks[k] = v;
  }

  const file = form.get('image') as File | null;
  let imageUrl: string | undefined;
  if (file) imageUrl = (await uploadToBlob(file, 'artists')).url;

  const str = (key: string) => {
    const v = form.get(key);
    return typeof v === 'string' && v ? v : null;
  };

  const row = {
    name: String(form.get('name') ?? ''),
    slug: String(form.get('slug') ?? ''),
    tagline: str('tagline'),
    bio: str('bio'),
    image_url: imageUrl ?? null,
    streaming_links: streamingLinks,
    social_links: socialLinks,
    featured_video_url: str('featuredVideoUrl'),
    spotify_embed_url: str('spotifyEmbedUrl'),
    legal_name: str('legalName'),
    stage_name: str('stageName'),
    address: str('address'),
    phone: str('phone'),
    country: str('country'),
    pro: str('pro'),
    ipi_number: str('ipiNumber'),
    publisher_name: str('publisherName'),
    publisher_ipi: str('publisherIpi'),
    contact_email: str('contactEmail'),
    is_featured: String(form.get('isFeatured')) === 'true',
    is_published: String(form.get('isPublished')) === 'true',
    sort_order: form.get('order') !== null ? Number(form.get('order')) : 0,
  };

  const sb = createClient();
  const { data, error } = await sb.from('artists').insert(row).select('*').maybeSingle();
  if (error) return fail(error.message, 400);
  return ok({ artist: toCamel(data) }, 201);
});

export const dynamic = 'force-dynamic';
