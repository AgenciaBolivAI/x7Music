import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { uploadToBlob } from '@/lib/blob';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

const entrySchema = z.object({
  client:               z.string().min(1),
  title:                z.string().min(1).max(200),
  type:                 z.enum(['song','album','ep','single']),
  isrc:                 z.string().optional(),
  iswc:                 z.string().optional(),
  upc:                  z.string().optional(),
  registeredPRO:        z.string().optional(),
  registeredMLC:        z.boolean().optional().default(false),
  distributionPlatforms:z.array(z.string()).optional().default([]),
  releaseDate:          z.string().optional(),
  status:               z.enum(['pending','in_progress','registered','issue']).optional().default('pending'),
  statusNotes:          z.string().optional(),
  coverArtUrl:          z.string().optional(),
});

// GET /api/catalog  — admin
export const GET = handler(async (req: Request) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const sb = createClient();
  const clientId = new URL(req.url).searchParams.get('clientId') || undefined;
  let q = sb
    .from('catalog_entries')
    .select('*, client:profiles!catalog_entries_client_id_fkey(first_name, last_name, email, company)')
    .order('created_at', { ascending: false });
  if (clientId) q = q.eq('client_id', clientId);
  const { data, error } = await q;
  if (error) return fail(error.message, 500);
  return ok({ entries: toCamel(data ?? []) });
});

// POST /api/catalog  — admin (coverArt upload → folder 'releases')
export const POST = handler(async (req: Request) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const form = await req.formData();

  const raw: Record<string, unknown> = {
    client:        String(form.get('client') ?? ''),
    title:         String(form.get('title') ?? ''),
    type:          form.get('type') ?? undefined,
    isrc:          form.get('isrc') ?? undefined,
    iswc:          form.get('iswc') ?? undefined,
    upc:           form.get('upc') ?? undefined,
    registeredPRO: form.get('registeredPRO') ?? undefined,
    releaseDate:   form.get('releaseDate') ?? undefined,
    status:        form.get('status') ?? undefined,
    statusNotes:   form.get('statusNotes') ?? undefined,
    coverArtUrl:   form.get('coverArtUrl') ?? undefined,
  };
  if (form.has('registeredMLC')) {
    const v = form.get('registeredMLC');
    raw.registeredMLC = String(v) === 'true' || String(v) === 'on';
  }
  if (form.has('distributionPlatforms')) {
    raw.distributionPlatforms = form.getAll('distributionPlatforms').map(String);
  }

  // Handle cover art upload
  const file = form.get('coverArt') as File | null;
  if (file && typeof file !== 'string') {
    const { url } = await uploadToBlob(file, 'releases');
    raw.coverArtUrl = url;
  }

  const parsed = entrySchema.safeParse(raw);
  if (!parsed.success) {
    return fail('Invalid data', 400, { errors: parsed.error.flatten() });
  }

  const row = {
    client_id:              parsed.data.client,
    title:                  parsed.data.title,
    type:                   parsed.data.type,
    isrc:                   parsed.data.isrc ?? null,
    iswc:                   parsed.data.iswc ?? null,
    upc:                    parsed.data.upc ?? null,
    registered_pro:         parsed.data.registeredPRO ?? null,
    registered_mlc:         parsed.data.registeredMLC,
    distribution_platforms: parsed.data.distributionPlatforms,
    release_date:           parsed.data.releaseDate ? new Date(parsed.data.releaseDate).toISOString() : null,
    status:                 parsed.data.status,
    status_notes:           parsed.data.statusNotes ?? null,
    cover_art_url:          parsed.data.coverArtUrl ?? null,
  };

  const sb = createClient();
  const { data, error } = await sb.from('catalog_entries').insert(row).select('*').maybeSingle();
  if (error) return fail(error.message, 400);
  return ok({ entry: toCamel(data) }, 201);
});

export const dynamic = "force-dynamic";
