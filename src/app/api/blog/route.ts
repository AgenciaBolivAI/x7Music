import { createClient } from '@/lib/supabase/server';
import { requireAdmin, getAuth } from '@/lib/auth';
import { uploadToBlob } from '@/lib/blob';
import { ok, fail, handler } from '@/lib/api';
import { toCamel } from '@/lib/supabase/map';

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 100);

// List columns exclude the heavy `content` body.
const LIST_COLUMNS =
  'id,title,slug,excerpt,cover_image_url,author,tags,category,is_published,published_at,created_at,updated_at';

// GET /api/blog — public, list posts
export const GET = handler(async (req: Request) => {
  const sb = createClient();
  const sp = new URL(req.url).searchParams;
  const page = parseInt(sp.get('page') || '1');
  const limit = parseInt(sp.get('limit') || '10');
  const tag = sp.get('tag') || undefined;
  const wantAll = sp.get('all') === 'true';
  const isAdmin = wantAll && (await getAuth())?.role === 'admin';
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let q = sb
    .from('blog_posts')
    .select(LIST_COLUMNS, { count: 'exact' })
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(from, to);
  if (!isAdmin) q = q.eq('is_published', true);
  if (tag) q = q.contains('tags', [tag]);

  const { data, error, count } = await q;
  if (error) return fail(error.message, 500);
  return ok({ posts: toCamel(data ?? []), total: count ?? 0, page });
});

// POST /api/blog — admin, create post (coverImage upload → 'blog')
export const POST = handler(async (req: Request) => {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const form = await req.formData();

  const file = form.get('coverImage') as File | null;
  let coverImageUrl: string | undefined;
  if (file) coverImageUrl = (await uploadToBlob(file, 'blog')).url;

  const str = (key: string) => {
    const v = form.get(key);
    return typeof v === 'string' && v ? v : null;
  };

  const title = String(form.get('title') ?? '');
  const slug = str('slug') ?? slugify(title);
  const isPublished = String(form.get('isPublished')) === 'true';

  const tagsRaw = form.get('tags');
  const tags = typeof tagsRaw === 'string' && tagsRaw
    ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  const row = {
    title,
    slug,
    excerpt: String(form.get('excerpt') ?? ''),
    content: String(form.get('content') ?? ''),
    cover_image_url: coverImageUrl ?? null,
    author: str('author') ?? 'Steven Pantojas',
    tags,
    category: str('category'),
    is_published: isPublished,
    published_at: isPublished ? (str('publishedAt') ?? new Date().toISOString()) : null,
  };

  const sb = createClient();
  const { data, error } = await sb.from('blog_posts').insert(row).select('*').maybeSingle();
  if (error) return fail(error.message, 400);
  return ok({ post: toCamel(data) }, 201);
});

export const dynamic = 'force-dynamic';
