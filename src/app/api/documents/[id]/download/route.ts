import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { fail, handler } from '@/lib/api';

// GET /api/documents/:id/download
// Authenticated proxy: only the owning client (or an admin) may fetch the bytes.
// The raw Vercel Blob URL is never exposed to the browser.
export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const sb = createClient();

  const { data: doc } = await sb
    .from('documents')
    .select('client_id, title, file_url')
    .eq('id', params.id)
    .maybeSingle();
  if (!doc) return fail('Document not found', 404);

  const isOwner = doc.client_id === auth.user.id;
  if (!isOwner && auth.user.role !== 'admin') return fail('Forbidden', 403);
  if (!doc.file_url) return fail('File unavailable', 404);

  const upstream = await fetch(doc.file_url);
  if (!upstream.ok || !upstream.body) return fail('File unavailable', 502);

  const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
  const ext = doc.file_url.split('.').pop()?.split(/[?#]/)[0] || 'bin';
  const safeName = (doc.title || 'document').replace(/[^a-z0-9.\-_ ]/gi, '_');

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${safeName}.${ext}"`,
      'Cache-Control': 'private, no-store',
    },
  });
});

export const dynamic = 'force-dynamic';
