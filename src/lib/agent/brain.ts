import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { embedOne } from '@/lib/llm';

export interface BrainHit {
  id: string;
  title: string;
  content: string;
  sourceType: string;
  similarity: number;
}

/**
 * Retrieve the most relevant brain chunks via the pgvector `search_brain` RPC.
 * Uses the request-scoped client so RLS applies as the caller: anon/clients only
 * ever match `visibility = 'public'` chunks; admins (include_internal) see all.
 */
export async function searchBrain(
  query: string,
  topK = 5,
  opts: { includeInternal?: boolean } = {}
): Promise<BrainHit[]> {
  let qVec: number[];
  try {
    qVec = await embedOne(query);
  } catch {
    return [];
  }
  const sb = createClient();
  const { data, error } = await sb.rpc('search_brain', {
    query_embedding: qVec as unknown as string,
    match_count: topK,
    include_internal: !!opts.includeInternal,
  });
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    id: r.id, title: r.title, content: r.content, sourceType: r.source_type, similarity: r.similarity,
  }));
}

/** Embed + store a brain chunk (service client — admin-managed knowledge). */
export async function ingestBrainChunk(input: {
  title: string;
  content: string;
  sourceType?: string;
  visibility?: string;
  tags?: string[];
  createdBy?: string;
}): Promise<{ id: string }> {
  const embedding = await embedOne(`${input.title}\n\n${input.content}`);
  const svc = createServiceClient();
  const { data, error } = await svc
    .from('brain_chunks')
    .insert({
      title: input.title,
      content: input.content,
      source_type: input.sourceType || 'knowledge',
      visibility: input.visibility === 'internal' ? 'internal' : 'public',
      tags: input.tags ?? [],
      embedding: embedding as unknown as string,
      created_by: input.createdBy ?? null,
    })
    .select('id')
    .maybeSingle();
  if (error || !data) throw new Error(error?.message || 'Failed to store brain chunk');
  return { id: data.id as string };
}
