'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Calendar, ArrowRight } from 'lucide-react';
import { getSessionStatus } from '@/api/bookingApi';
import { useLanguage } from '@/context/LanguageContext';

export const dynamic = 'force-dynamic';

const BookSuccessPage = () => {
  const { t } = useLanguage();
  const params = useSearchParams();
  const sessionId = params.get('session_id');
  const isFree    = params.get('free') === '1';
  const [status, setStatus] = useState<'loading' | 'paid' | 'pending' | 'error'>('loading');
  const [service, setService] = useState<{ title: string; duration: number } | null>(null);

  useEffect(() => {
    if (isFree) { setStatus('paid'); return; }
    if (!sessionId) { setStatus('error'); return; }
    getSessionStatus(sessionId)
      .then((res) => {
        setStatus(res.data.paymentStatus === 'paid' ? 'paid' : 'pending');
        const svc = res.data.booking?.service;
        if (svc && typeof svc === 'object') setService(svc as { title: string; duration: number });
      })
      .catch(() => setStatus('error'));
  }, [sessionId, isFree]);

  return (
    <div className="pt-24 min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
            <p className="text-brand-gray-muted">{t('bookSuccess.confirming')}</p>
          </div>
        )}

        {status === 'paid' && (
          <div className="card p-10">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={32} className="text-green-400" />
            </div>
            <h1 className="text-3xl font-heading font-bold text-white mb-3">
              {isFree ? t('bookSuccess.freeTitle') : t('bookSuccess.title')}
            </h1>
            {service && (
              <p className="text-brand-gray-muted mb-2">
                <strong className="text-white">{service.title}</strong> · {service.duration} min
              </p>
            )}
            <p className="text-brand-gray-muted mb-8">
              {isFree ? t('bookSuccess.freeSubtitle') : t('bookSuccess.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/portal/bookings" className="btn-primary flex items-center justify-center gap-2">
                <Calendar size={16} /> {t('bookSuccess.viewBookings')}
              </Link>
              <Link href="/" className="btn-outline flex items-center justify-center gap-2">
                {t('bookSuccess.backHome')} <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        )}

        {status === 'pending' && (
          <div className="card p-10">
            <h1 className="text-2xl font-heading font-bold text-white mb-3">{t('bookSuccess.paymentProcessing')}</h1>
            <p className="text-brand-gray-muted mb-6">{t('bookSuccess.paymentProcessingBody')}</p>
            <Link href="/portal/bookings" className="btn-primary">{t('bookSuccess.checkBookings')}</Link>
          </div>
        )}

        {status === 'error' && (
          <div className="card p-10">
            <h1 className="text-2xl font-heading font-bold text-white mb-3">{t('bookSuccess.somethingWrong')}</h1>
            <p className="text-brand-gray-muted mb-6">
              {t('bookSuccess.somethingWrongBody')}{' '}
              <a href="mailto:info@x7musicgroup.com" className="text-brand-red hover:underline">info@x7musicgroup.com</a>.
            </p>
            <Link href="/book" className="btn-primary">{t('bookSuccess.tryAgain')}</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default function BookSuccessPageWrapper() {
  return (
    <Suspense fallback={null}>
      <BookSuccessPage />
    </Suspense>
  );
}
