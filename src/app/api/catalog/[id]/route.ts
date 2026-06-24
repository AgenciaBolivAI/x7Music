import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { uploadToBlob, deleteBlob } from '@/lib/blob';
import { sendCatalogStatusUpdate } from '@/lib/services/email';
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

// Map a parsed camelCase field → its snake_case column.
const COLMAP: Record<string, string> = {
  client: 'client_id',
  title: 'title',
  type: 'type',
  isrc: 'isrc',
  iswc: 'iswc',
  upc: 'upc',
  registeredPRO: 'registered_pro',
  registeredMLC: 'registered_mlc',
  distributionPlatforms: 'distribution_platforms',
  releaseDate: 'release_date',
  status: 'status',
  statusNotes: 'status_notes',
  coverArtUrl: 'cover_art_url',
};

// PUT /api/catalog/:id  — admin (coverArt upload → folder 'releases')
export const PUT = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();

  const form = await req.formData();

  // Only include fields actually present, to preserve partial-update semantics.
  const raw: Record<string, unknown> = {};
  const stringFields = [
    'client', 'title', 'type', 'isrc', 'iswc', 'upc',
    'registeredPRO', 'releaseDate', 'status', 'statusNotes', 'coverArtUrl',
  ];
  for (const f of stringFields) {
    if (form.has(f)) raw[f] = String(form.get(f) ?? '');
  }
  if (form.has('registeredMLC')) {
    const v = form.get('registeredMLC');
    raw.registeredMLC = String(v) === 'true' || String(v) === 'on';
  }
  if (form.has('distributionPlatforms')) {
    raw.distributionPlatforms = form.getAll('distributionPlatforms').map(String);
  }

  // Handle cover art upload — delete old blob if replacing
  const file = form.get('coverArt') as File | null;
  if (file && typeof file !== 'string') {
    const { data: old } = await sb.from('catalog_entries').select('cover_art_url').eq('id', params.id).maybeSingle();
    if (old?.cover_art_url) await deleteBlob(old.cover_art_url);
    const { url } = await uploadToBlob(file, 'releases');
    raw.coverArtUrl = url;
  }

  const parsed = entrySchema.partial().safeParse(raw);
  if (!parsed.success) {
    return fail('Invalid data', 400, { errors: parsed.error.flatten() });
  }

  // Map parsed camelCase fields → snake_case columns (only what's present).
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    const col = COLMAP[k];
    if (!col) continue;
    updates[col] = k === 'releaseDate' && v ? new Date(String(v)).toISOString() : v;
  }

  const { data: prevEntry } = await sb.from('catalog_entries').select('status').eq('id', params.id).maybeSingle();

  const { data: entry, error } = await sb
    .from('catalog_entries')
    .update(updates)
    .eq('id', params.id)
    .select('*, client:profiles!catalog_entries_client_id_fkey(first_name, last_name, email)')
    .maybeSingle();

  if (error) return fail(error.message, 400);
  if (!entry) return fail('Entry not found', 404);

  // Email client if status changed
  if (parsed.data.status && prevEntry?.status !== parsed.data.status) {
    const client = entry.client as unknown as { first_name: string; email: string };
    sendCatalogStatusUpdate(
      client.email, client.first_name, entry.title,
      parsed.data.status, parsed.data.statusNotes || ''
    ).catch(console.error);
  }

  return ok({ entry: toCamel(entry) });
});

// DELETE /api/catalog/:id  — admin
export const DELETE = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const sb = createClient();
  await sb.from('catalog_entries').delete().eq('id', params.id);
  return ok({ message: 'Entry deleted' });
});

export const dynamic = "force-dynamic";
