'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Clock, DollarSign, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getServices, Service } from '@/api/serviceApi';
import SEO from '@/components/common/SEO';
import { getCalendarMonth, getSlots } from '@/api/availabilityApi';
import { createBooking } from '@/api/bookingApi';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

export const dynamic = 'force-dynamic';

// ── Mini calendar helpers ─────────────────────────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const isoDate = (y: number, m: number, d: number) =>
  `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

// ── Steps ─────────────────────────────────────────────────────────────────────
type Step = 'service' | 'date' | 'time' | 'confirm';

const BookPage = () => {
  const { t } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const router   = useRouter();
  const params   = useSearchParams();

  const [services, setServices]         = useState<Service[]>([]);
  const [selected, setSelected]         = useState<Service | null>(null);
  const [step, setStep]                 = useState<Step>('service');

  // Calendar state
  const today = new Date();
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth()); // 0-based
  const [availDates, setAvailDates]  = useState<Set<string>>(new Set());
  const [loadingCal, setLoadingCal]  = useState(false);
  const [pickedDate, setPickedDate]  = useState('');

  // Slots state
  const [slots, setSlots]         = useState<string[]>([]);
  const [pickedSlot, setPickedSlot] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Notes + submit
  const [notes, setNotes]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pre-select service from URL param
  useEffect(() => {
    const load = async () => {
      const res = await getServices();
      setServices(res.data.services);
      const slug = params.get('service');
      if (slug) {
        const match = res.data.services.find((s) => s.slug === slug);
        if (match) { setSelected(match); setStep('date'); }
      }
    };
    load().catch(console.error);
  }, [params]);

  // Load calendar availability when service + month changes
  const loadCalendar = useCallback(async (service: Service, year: number, month: number) => {
    setLoadingCal(true);
    try {
      const res = await getCalendarMonth(year, month + 1, service._id); // API uses 1-based month
      setAvailDates(new Set(res.data.availableDates));
    } catch { toast.error('Failed to load availability'); }
    finally { setLoadingCal(false); }
  }, []);

  useEffect(() => {
    if (selected && step === 'date') {
      loadCalendar(selected, calYear, calMonth);
    }
  }, [selected, calYear, calMonth, step, loadCalendar]);

  // Load time slots when date is picked
  useEffect(() => {
    if (!pickedDate || !selected) return;
    setLoadingSlots(true);
    setSlots([]);
    setPickedSlot('');
    getSlots(pickedDate, selected._id)
      .then((res) => setSlots(res.data.slots))
      .catch(() => toast.error('Failed to load time slots'))
      .finally(() => setLoadingSlots(false));
  }, [pickedDate, selected]);

  const handleSelectService = (s: Service) => {
    setSelected(s);
    setPickedDate('');
    setPickedSlot('');
    setStep('date');
  };

  const handlePickDate = (dateStr: string) => {
    setPickedDate(dateStr);
    setPickedSlot('');
    setStep('time');
  };

  const handlePickSlot = (slot: string) => {
    setPickedSlot(slot);
    setStep('confirm');
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to complete your booking');
      router.push('/login');
      return;
    }
    if (!selected || !pickedDate || !pickedSlot) return;

    // Build ISO datetime from picked date + slot (UTC)
    const scheduledAt = new Date(`${pickedDate}T${pickedSlot}:00.000Z`).toISOString();

    setSubmitting(true);
    try {
      const res = await createBooking({ serviceId: selected._id, scheduledAt, notes });

      if (res.data.checkoutUrl) {
        // Paid — redirect to Stripe
        window.location.href = res.data.checkoutUrl;
      } else {
        // Free — confirmed immediately
        router.push('/book/success?free=1');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Booking failed. The time slot may no longer be available.';
      toast.error(msg);
      // Go back to time selection
      setStep('time');
      setPickedSlot('');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Calendar rendering ──────────────────────────────────────────────────────
  const renderCalendar = () => {
    const firstDay   = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const todayStr   = today.toISOString().slice(0, 10);

    const cells: JSX.Element[] = [];
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />);
    for (let d = 1; d <= daysInMonth; d++) {
      const ds      = isoDate(calYear, calMonth, d);
      const isPast  = ds < todayStr;
      const isAvail = availDates.has(ds);
      const isPicked = ds === pickedDate;
      cells.push(
        <button key={d} disabled={isPast || !isAvail || loadingCal}
          onClick={() => handlePickDate(ds)}
          className={[
            'w-full aspect-square rounded-lg text-sm font-medium transition-colors',
            isPicked  ? 'bg-brand-red text-white'                              : '',
            !isPicked && isAvail  ? 'bg-brand-gray-light text-white hover:bg-brand-red/70' : '',
            !isPicked && !isAvail ? 'text-brand-gray-muted/40 cursor-not-allowed'          : '',
            isPast    ? 'opacity-30 cursor-not-allowed' : '',
          ].join(' ')}
        >
          {d}
        </button>
      );
    }
    return cells;
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };
  const canGoPrev = new Date(calYear, calMonth, 1) > new Date(today.getFullYear(), today.getMonth(), 1);

  const formatTime = (slot: string) => {
    const [h, m] = slot.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`;
  };

  const formatPrice = (cents: number) =>
    cents === 0 ? t('common.free') : `$${(cents / 100).toFixed(2)} USD`;

  // ── Breadcrumb ──────────────────────────────────────────────────────────────
  const StepBreadcrumb = () => (
    <div className="flex items-center gap-2 text-sm mb-8 flex-wrap">
      {(['service', 'date', 'time', 'confirm'] as Step[]).map((s, i) => (
        <span key={s} className="flex items-center gap-2">
          {i > 0 && <span className="text-brand-gray-muted">/</span>}
          <span className={step === s ? 'text-brand-red font-semibold' : 'text-brand-gray-muted'}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="pt-24 max-w-3xl mx-auto px-4 py-12">
      <SEO title="Book a Session" description="Book a 1-hour music business consultation or free 10-minute intro call with Steven Pantojas of X7 Music Group. Pick your time and pay securely online." url="/book" />
      <h1 className="section-title mb-2">{t('book.title')}</h1>
      <p className="text-brand-gray-muted mb-8">
        {t('book.subtitle')}
      </p>

      <StepBreadcrumb />

      {/* Step 1: Service Selection */}
      {step === 'service' && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-5">{t('book.chooseService')}</h2>
          <div className="flex flex-col gap-4">
            {services.map((s) => (
              <button key={s._id} onClick={() => handleSelectService(s)}
                className="card p-5 text-left hover:border-brand-red/60 transition-colors group">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-semibold text-lg mb-1 group-hover:text-brand-red transition-colors">
                      {s.title}
                    </h3>
                    <p className="text-brand-gray-muted text-sm mb-4 leading-relaxed">{s.description}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-brand-gray-muted">
                        <Clock size={13} /> {s.duration} {t('common.min')}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-white">
                        <DollarSign size={13} className="text-brand-red" />
                        {formatPrice(s.price)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-brand-gray-muted group-hover:text-brand-red transition-colors flex-shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
          {!isAuthenticated && (
            <div className="mt-8 p-4 rounded-lg border border-brand-red/20 bg-brand-red/5 text-sm text-brand-gray-muted">
              {t('book.needAccount')}{' '}
              <Link href="/login" className="text-brand-red hover:underline">{t('book.logInToBook')}</Link>{' '}
              {t('book.needAccountOr')}{' '}
              <Link href="/register" className="text-brand-red hover:underline">{t('book.createAccount')}</Link>{' '}
              {t('book.needAccountToComplete')}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Date Selection */}
      {step === 'date' && selected && (
        <div>
          <button onClick={() => setStep('service')} className="btn-ghost mb-5 flex items-center gap-1 text-sm">
            <ChevronLeft size={14} /> {t('book.back')}
          </button>
          <div className="card p-3 mb-5 flex items-center gap-3">
            <div>
              <span className="text-white font-medium">{selected.title}</span>
              <span className="text-brand-gray-muted text-sm ml-3">{selected.duration} {t('common.min')} · {formatPrice(selected.price)}</span>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-white mb-5">{t('book.selectDate')}</h2>

          <div className="card p-5">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} disabled={!canGoPrev} className="btn-ghost p-2 disabled:opacity-30">
                <ChevronLeft size={18} />
              </button>
              <h3 className="text-white font-semibold">{MONTH_NAMES[calMonth]} {calYear}</h3>
              <button onClick={nextMonth} className="btn-ghost p-2">
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-center text-xs text-brand-gray-muted py-1">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            {loadingCal ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {renderCalendar()}
              </div>
            )}

            <p className="text-xs text-brand-gray-muted mt-4">
              {t('book.timezoneNote')}
            </p>
          </div>
        </div>
      )}

      {/* Step 3: Time Slot Selection */}
      {step === 'time' && selected && pickedDate && (
        <div>
          <button onClick={() => { setStep('date'); setPickedSlot(''); }} className="btn-ghost mb-5 flex items-center gap-1 text-sm">
            <ChevronLeft size={14} /> {t('book.back')}
          </button>
          <h2 className="text-xl font-semibold text-white mb-2">{t('book.selectTime')}</h2>
          <p className="text-brand-gray-muted text-sm mb-5">
            {new Date(`${pickedDate}T12:00:00Z`).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric', timeZone:'UTC' })}
          </p>

          {loadingSlots ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
            </div>
          ) : slots.length === 0 ? (
            <div className="card p-8 text-center text-brand-gray-muted">
              {t('book.noSlotsAvailable')}{' '}
              <button onClick={() => setStep('date')} className="text-brand-red hover:underline">{t('book.chooseAnotherDay')}</button>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {slots.map((slot) => (
                <button key={slot} onClick={() => handlePickSlot(slot)}
                  className="card py-3 px-4 text-center text-white font-medium text-sm hover:border-brand-red hover:text-brand-red transition-colors">
                  {formatTime(slot)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 'confirm' && selected && (
        <div>
          <button onClick={() => { setStep('time'); }} className="btn-ghost mb-5 flex items-center gap-1 text-sm">
            <ChevronLeft size={14} /> {t('book.back')}
          </button>
          <h2 className="text-xl font-semibold text-white mb-5">{t('book.confirm')}</h2>

          <div className="card p-6 mb-5">
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-brand-gray-muted">{t('book.service')}</dt>
                <dd className="text-white font-medium">{selected.title}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brand-gray-muted">{t('book.date')}</dt>
                <dd className="text-white">
                  {new Date(`${pickedDate}T12:00:00Z`).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric', timeZone:'UTC' })}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brand-gray-muted">{t('book.time')}</dt>
                <dd className="text-white">{pickedSlot && (() => { const [h,m]=pickedSlot.split(':').map(Number); return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'} UTC`; })()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brand-gray-muted">{t('book.duration')}</dt>
                <dd className="text-white">{selected.duration} {t('common.minutes')}</dd>
              </div>
              <div className="flex justify-between border-t border-brand-gray-light pt-3 mt-1">
                <dt className="text-brand-gray-muted font-semibold">{t('book.total')}</dt>
                <dd className="text-white font-bold text-base">{formatPrice(selected.price)}</dd>
              </div>
            </dl>
          </div>

          <div className="mb-5">
            <label className="label">{t('book.notesLabel')} <span className="text-brand-gray-muted font-normal">({t('common.optional')})</span></label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              className="input min-h-[80px] resize-y"
              placeholder={t('book.notesPlaceholder')} />
          </div>

          {!isAuthenticated ? (
            <div className="space-y-3">
              <p className="text-brand-gray-muted text-sm">{t('book.loginFirst')}</p>
              <div className="flex gap-3">
                <Link href={`/login?redirect=/book`} className="btn-primary flex-1 text-center">{t('book.logInToBook')}</Link>
                <Link href="/register" className="btn-outline flex-1 text-center">{t('book.createAccount')}</Link>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-brand-gray-muted text-sm mb-4">
                {t('book.bookAs')} <strong className="text-white">{user?.firstName} {user?.lastName}</strong> ({user?.email})
              </p>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full text-base py-4">
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t('book.processing')}
                  </span>
                ) : selected.isFree ? t('book.confirmFreeBooking') : `${t('book.payAndBook')} ${formatPrice(selected.price)}`}
              </button>
              {!selected.isFree && (
                <p className="text-xs text-brand-gray-muted text-center mt-3">
                  {t('book.stripeNote')}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function BookPageWrapper() {
  return (
    <Suspense fallback={null}>
      <BookPage />
    </Suspense>
  );
}
