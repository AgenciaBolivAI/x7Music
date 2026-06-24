import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, zodFail, handler } from '@/lib/api';
import { llmConfigured } from '@/lib/llm';
import { ingestBrainChunk } from '@/lib/agent/brain';
import { toCamel } from '@/lib/supabase/map';

// GET /api/admin/brain — list chunks (no embeddings) + counts
export const GET = handler(async () => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();
  const { data, error } = await sb
    .from('brain_chunks')
    .select('id, title, content, source_type, visibility, tags, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return fail(error.message, 500);
  const chunks = data ?? [];
  return ok({ chunks: toCamel(chunks), total: chunks.length, active: chunks.filter((c) => c.is_active).length });
});

const addSchema = z.object({
  title: z.string().trim().min(2).max(160),
  content: z.string().trim().min(5).max(8000),
  sourceType: z.enum(['knowledge', 'faq', 'decision', 'policy', 'music-business']).optional(),
  visibility: z.enum(['public', 'internal']).optional(),
  tags: z.array(z.string().trim().max(40)).max(12).optional(),
});

// POST /api/admin/brain — embed + store a knowledge chunk
export const POST = handler(async (req: Request) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  if (!llmConfigured()) return fail('Embeddings are not configured (set the AI keys).', 503);

  const parsed = addSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return zodFail(parsed.error);

  const { id } = await ingestBrainChunk({ ...parsed.data, createdBy: auth.user.id });
  return ok({ id }, 201);
});

export const dynamic = 'force-dynamic';
