'use client';

import { useEffect, useState } from 'react';
import { FileText, Download, Check, ArrowRight } from 'lucide-react';
import { getResources, requestResource, type Resource } from '@/api/resourceApi';
import SEO from '@/components/common/SEO';
import { useLanguage } from '@/context/LanguageContext';

function ResourceCard({ resource }: { resource: Resource }) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setStatus('sending');
    try {
      const res = await requestResource({ name: name.trim(), email: email.trim(), slug: resource.slug, language });
      setDownloadUrl(res.data.downloadUrl);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="card p-6 flex flex-col">
      <div className="w-12 h-12 bg-brand-red/10 rounded-xl flex items-center justify-center mb-4">
        <FileText size={22} className="text-brand-red" />
      </div>
      {resource.category && (
        <p className="text-brand-red text-xs font-semibold uppercase tracking-wide mb-1">{resource.category}</p>
      )}
      <h3 className="text-white font-heading font-semibold text-lg mb-2">{resource.title}</h3>
      {resource.description && (
        <p className="text-brand-gray-muted text-sm leading-relaxed flex-1">{resource.description}</p>
      )}

      {status === 'done' ? (
        <div className="mt-5">
          <p className="text-green-400 text-sm flex items-center gap-2 mb-3">
            <Check size={15} /> {t('resources.sent')}
          </p>
          {downloadUrl && (
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer"
              className="btn-primary text-sm w-full flex items-center justify-center gap-2">
              <Download size={15} /> {t('resources.downloadNow')}
            </a>
          )}
        </div>
      ) : !open ? (
        <button onClick={() => setOpen(true)} className="btn-primary text-sm mt-5 flex items-center justify-center gap-2">
          {t('resources.getFree')} <ArrowRight size={15} />
        </button>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-2">
          <input className="input w-full text-sm py-2" placeholder={t('resources.name')} value={name}
            onChange={(e) => setName(e.target.value)} required />
          <input type="email" className="input w-full text-sm py-2" placeholder={t('resources.email')} value={email}
            onChange={(e) => setEmail(e.target.value)} required />
          <button type="submit" disabled={status === 'sending'} className="btn-primary text-sm w-full">
            {status === 'sending' ? t('resources.sending') : t('resources.send')}
          </button>
          {status === 'error' && <p className="text-red-400 text-xs">{t('resources.error')}</p>}
          <p className="text-brand-gray-muted text-[11px] leading-snug">{t('resources.consent')}</p>
        </form>
      )}
    </div>
  );
}

export default function ResourcesPage() {
  const { t } = useLanguage();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getResources()
      .then((res) => setResources(res.data.resources))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pt-24 min-h-screen">
      <SEO title="Free Resources" description="Free music-business guides from X7 Music Group — copyright, publishing, royalties and more." url="/resources" />

      <section className="bg-gradient-to-b from-brand-gray to-brand-black py-16 px-4 text-center">
        <p className="text-brand-red font-semibold tracking-widest uppercase text-sm mb-4">{t('resources.label')}</p>
        <h1 className="section-title mb-4">{t('resources.title')}</h1>
        <p className="text-brand-gray-muted max-w-xl mx-auto">{t('resources.subtitle')}</p>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-14">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : resources.length === 0 ? (
          <div className="card p-12 text-center">
            <FileText size={40} className="text-brand-gray-muted mx-auto mb-4" />
            <p className="text-brand-gray-muted">{t('resources.empty')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((r) => <ResourceCard key={r._id} resource={r} />)}
          </div>
        )}
      </section>
    </div>
  );
}
