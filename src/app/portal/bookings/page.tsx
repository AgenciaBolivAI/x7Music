'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Clock, DollarSign, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { getMyBookings, Booking } from '@/api/bookingApi';
import { useLanguage } from '@/context/LanguageContext';

const StatusBadge = ({ status }: { status: Booking['status'] }) => (
  <span className={`badge-${status}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
);

const PayBadge = ({ status }: { status: Booking['paymentStatus'] }) => {
  const map = { paid: 'badge-completed', unpaid: 'badge-pending', waived: 'badge-confirmed' } as const;
  return <span className={map[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
};

const MyBookingsPage = () => {
  const { t } = useLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    getMyBookings()
      .then((res) => setBookings(res.data.bookings))
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    });

  const formatPrice = (cents: number) =>
    cents === 0 ? t('common.free') : `$${(cents / 100).toFixed(2)}`;

  const upcoming = bookings.filter((b) => new Date(b.scheduledAt) >= new Date() && b.status !== 'cancelled');
  const past     = bookings.filter((b) => new Date(b.scheduledAt) <  new Date() || b.status === 'cancelled');

  const BookingCard = ({ b }: { b: Booking }) => {
    const svc = typeof b.service === 'object' ? b.service : null;
    return (
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-white font-semibold">{svc?.title ?? 'Session'}</h3>
              <StatusBadge status={b.status} />
              <PayBadge status={b.paymentStatus} />
            </div>
            <div className="flex flex-col gap-1 mt-2 text-sm text-brand-gray-muted">
              <span className="flex items-center gap-2">
                <Calendar size={13} className="text-brand-red" />
                {formatDate(b.scheduledAt)}
              </span>
              {svc && (
                <>
                  <span className="flex items-center gap-2">
                    <Clock size={13} className="text-brand-red" /> {svc.duration} {t('common.minutes')}
                  </span>
                  <span className="flex items-center gap-2">
                    <DollarSign size={13} className="text-brand-red" /> {formatPrice(b.totalAmount)}
                  </span>
                </>
              )}
            </div>
            {b.notes && (
              <p className="mt-3 text-sm text-brand-gray-muted bg-brand-gray-light rounded-lg p-3">
                <strong className="text-white">{t('portal.bookings.notes')}</strong> {b.notes}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            {b.invoiceId && (
              <Link href={`/portal/documents`} className="btn-ghost text-xs flex items-center gap-1 py-1.5">
                <FileText size={13} /> {t('portal.bookings.invoice')}
              </Link>
            )}
            {b.paymentStatus === 'unpaid' && b.stripeCheckoutSessionId && (
              <a
                href={`https://checkout.stripe.com/c/pay/${b.stripeCheckoutSessionId}`}
                className="btn-primary text-xs py-2"
              >
                {t('portal.bookings.completePayment')}
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="section-title">{t('portal.bookings.title')}</h1>
        <Link href="/book" className="btn-primary text-sm">{t('portal.bookings.newBooking')}</Link>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-16 card">
          <Calendar size={40} className="text-brand-gray-muted mx-auto mb-4" />
          <h2 className="text-white font-semibold text-lg mb-2">{t('portal.bookings.noBookings')}</h2>
          <p className="text-brand-gray-muted mb-6">{t('portal.bookings.noBookingsDesc')}</p>
          <Link href="/book" className="btn-primary">{t('portal.dashboard.bookSession')}</Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-white mb-4">{t('portal.bookings.upcoming')}</h2>
              <div className="flex flex-col gap-3">
                {upcoming.map((b) => <BookingCard key={b._id} b={b} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 opacity-70">{t('portal.bookings.past')}</h2>
              <div className="flex flex-col gap-3 opacity-70">
                {past.map((b) => <BookingCard key={b._id} b={b} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyBookingsPage;
