import { createClient } from '@/lib/supabase/server';
import { requireAdmin, getAuth } from '@/lib/auth';
import { uploadToBlob, deleteBlob } from '@/lib/blob';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

// GET /api/blog/:slug — public, find by slug (admin-only ?preview=true for drafts)
export const GET = handler(async (req: Request, { params }: { params: { slug: string } }) => {
  const sb = createClient();
  // Draft preview is admin-only; the public can only fetch a published post.
  const wantPreview = new URL(req.url).searchParams.get('preview') === 'true';
  const isAdmin = wantPreview && (await getAuth())?.role === 'admin';
  let q = sb.from('blog_posts').select('*').eq('slug', params.slug);
  if (!isAdmin) q = q.eq('is_published', true);
  const { data, error } = await q.maybeSingle();
  if (error) return fail(error.message, 500);
  if (!data) return fail('Post not found', 404);
  return ok({ post: toCamel(data) });
});

// PUT /api/blog/:id — admin, param treated as id (coverImage upload → 'blog')
export const PUT = handler(async (req: Request, { params }: { params: { slug: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();

  const form = await req.formData();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};
  const setStr = (col: string, key: string) => { const v = form.get(key); if (typeof v === 'string') updates[col] = v; };
  setStr('title', 'title');
  setStr('slug', 'slug');
  setStr('excerpt', 'excerpt');
  setStr('content', 'content');
  setStr('author', 'author');
  setStr('category', 'category');

  const file = form.get('coverImage') as File | null;
  if (file) {
    const { data: old } = await sb.from('blog_posts').select('cover_image_url').eq('id', params.slug).maybeSingle();
    if (old?.cover_image_url) await deleteBlob(old.cover_image_url);
    updates.cover_image_url = (await uploadToBlob(file, 'blog')).url;
  }

  if (form.has('isPublished')) {
    const isPublished = String(form.get('isPublished')) === 'true';
    updates.is_published = isPublished;
    if (isPublished && !form.get('publishedAt')) {
      updates.published_at = new Date().toISOString();
    }
  }
  if (form.get('publishedAt')) updates.published_at = String(form.get('publishedAt'));

  const tagsRaw = form.get('tags');
  if (typeof tagsRaw === 'string') {
    updates.tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);
  }

  const { data, error } = await sb.from('blog_posts').update(updates).eq('id', params.slug).select('*').maybeSingle();
  if (error) return fail(error.message, 400);
  if (!data) return fail('Post not found', 404);
  return ok({ post: toCamel(data) });
});

// DELETE /api/blog/:id — admin, param treated as id
export const DELETE = handler(async (req: Request, { params }: { params: { slug: string } }) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const sb = createClient();
  const { data } = await sb.from('blog_posts').select('cover_image_url').eq('id', params.slug).maybeSingle();
  await sb.from('blog_posts').delete().eq('id', params.slug);
  if (data?.cover_image_url) await deleteBlob(data.cover_image_url);
  return ok({ message: 'Post deleted' });
});

export const dynamic = 'force-dynamic';
