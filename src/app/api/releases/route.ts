import { createClient } from '@/lib/supabase/server';
import { requireAdmin, getAuth } from '@/lib/auth';
import { uploadToBlob } from '@/lib/blob';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

const STREAMING_KEYS = ['spotify', 'appleMusic', 'youtube', 'amazonMusic', 'tidal'] as const;

export const GET = handler(async (req: Request) => {
  const sb = createClient();
  const wantAll = new URL(req.url).searchParams.get('all') === 'true';
  const isAdmin = wantAll && (await getAuth())?.role === 'admin';
  let q = sb.from('releases').select('*').order('release_date', { ascending: false });
  if (!isAdmin) q = q.eq('is_published', true);
  const { data, error } = await q;
  if (error) return fail(error.message, 500);
  return ok({ releases: toCamel(data ?? []) });
});

export const POST = handler(async (req: Request) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const form = await req.formData();
  const streamingLinks: Record<string, string> = {};
  for (const k of STREAMING_KEYS) {
    const v = form.get(`streamingLinks.${k}`);
    if (typeof v === 'string' && v) streamingLinks[k] = v;
  }
  const file = form.get('coverArt') as File | null;
  let coverArtUrl: string | undefined;
  if (file) coverArtUrl = (await uploadToBlob(file, 'releases')).url;

  const row = {
    title: String(form.get('title') ?? ''),
    artist: String(form.get('artist') ?? ''),
    type: String(form.get('type') ?? 'single'),
    release_date: form.get('releaseDate') ? new Date(String(form.get('releaseDate'))).toISOString() : new Date().toISOString(),
    description: String(form.get('description') ?? '') || null,
    streaming_links: streamingLinks,
    cover_art_url: coverArtUrl ?? null,
    is_featured: String(form.get('isFeatured')) === 'true',
    is_published: String(form.get('isPublished')) === 'true',
  };

  const sb = createClient();
  const { data, error } = await sb.from('releases').insert(row).select('*').maybeSingle();
  if (error) return fail(error.message, 400);
  return ok({ release: toCamel(data) }, 201);
});

export const dynamic = 'force-dynamic';
