'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, GraduationCap } from 'lucide-react';
import { getPosts, type BlogPost } from '@/api/blogApi';
import SEO from '@/components/common/SEO';
import { useLanguage } from '@/context/LanguageContext';

export default function CheckzonePage() {
  const { t } = useLanguage();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPosts()
      .then((res) => setPosts(res.data.posts))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pt-24 min-h-screen">
      <SEO title="CHECKZONE — Music Education" description="CHECKZONE by X7 Music Group — free music business education for artists, producers, and worship leaders." url="/checkzone" />

      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-gray to-brand-black py-20 px-4 text-center">
        <p className="text-brand-red font-semibold tracking-widest uppercase text-sm mb-4">{t('checkzone.heroLabel')}</p>
        <h1 className="text-5xl md:text-6xl font-heading font-black text-white mb-6">CHECKZONE</h1>
        <p className="text-brand-gray-muted text-xl max-w-2xl mx-auto leading-relaxed">
          {t('checkzone.heroSubtitle')}
        </p>
      </section>

      {/* Posts */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-heading font-bold text-white mb-8">{t('checkzone.latestTitle')}</h2>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="card p-12 text-center">
            <BookOpen size={40} className="text-brand-gray-muted mx-auto mb-4" />
            <p className="text-brand-gray-muted">{t('checkzone.noPosts')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link key={post._id} href={`/checkzone/${post.slug}`} className="card overflow-hidden group hover:border-brand-red/50 transition-colors">
                {post.coverImageUrl ? (
                  <div className="h-44 overflow-hidden">
                    <img src={post.coverImageUrl} alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                ) : (
                  <div className="h-44 bg-brand-gray-light flex items-center justify-center">
                    <GraduationCap size={36} className="text-brand-gray-muted" />
                  </div>
                )}
                <div className="p-5">
                  {post.category && (
                    <p className="text-brand-red text-xs font-semibold uppercase tracking-wide mb-1.5">{post.category}</p>
                  )}
                  <h3 className="text-white font-heading font-semibold leading-snug mb-2">{post.title}</h3>
                  {post.excerpt && (
                    <p className="text-brand-gray-muted text-sm line-clamp-3 mb-3">{post.excerpt}</p>
                  )}
                  <span className="text-brand-red text-sm inline-flex items-center gap-1">
                    {t('checkzone.readMore')} <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="bg-brand-red/10 border-y border-brand-red/20 py-16 px-4 text-center">
        <h2 className="section-title mb-4">{t('checkzone.ctaTitle')}</h2>
        <p className="text-brand-gray-muted mb-8 max-w-xl mx-auto">{t('checkzone.ctaSubtitle')}</p>
        <Link href="/book" className="btn-primary text-lg px-8 py-3 inline-flex items-center gap-2">
          {t('checkzone.ctaButton')} <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
