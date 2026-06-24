'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { getPostBySlug, type BlogPost } from '@/api/blogApi';
import SEO from '@/components/common/SEO';
import { useLanguage } from '@/context/LanguageContext';

export default function CheckzonePostPage() {
  const { slug } = useParams() as { slug: string };
  const { t } = useLanguage();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getPostBySlug(slug)
      .then((res) => setPost(res.data.post))
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="pt-24 min-h-screen flex justify-center items-center">
        <div className="w-10 h-10 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="pt-24 min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <BookOpen size={48} className="text-brand-gray-muted mb-4" />
        <p className="text-brand-gray-muted text-lg mb-6">{t('checkzone.postNotFound')}</p>
        <Link href="/checkzone" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft size={16} /> {t('checkzone.backToCheckzone')}
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen">
      <SEO title={post.title} description={post.excerpt || post.title} url={`/checkzone/${post.slug}`} />

      <article className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/checkzone" className="inline-flex items-center gap-1.5 text-sm text-brand-gray-muted hover:text-white transition-colors mb-8">
          <ArrowLeft size={14} /> {t('checkzone.backToCheckzone')}
        </Link>

        {post.category && (
          <p className="text-brand-red text-sm font-semibold uppercase tracking-wide mb-2">{post.category}</p>
        )}
        <h1 className="text-3xl md:text-4xl font-heading font-black text-white mb-4 leading-tight">{post.title}</h1>
        <p className="text-brand-gray-muted text-sm mb-8">
          {post.author}
          {post.publishedAt && ` · ${new Date(post.publishedAt).toLocaleDateString()}`}
        </p>

        {post.coverImageUrl && (
          <img src={post.coverImageUrl} alt={post.title} className="w-full rounded-xl mb-10" />
        )}

        {/* TipTap HTML content from the admin editor */}
        <div
          className="rich-content"
          dangerouslySetInnerHTML={{ __html: post.content ?? '' }}
        />
      </article>
    </div>
  );
}
