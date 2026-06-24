'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronDown, MessageSquare, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAllBookings, updateBookingStatus, updateAdminNotes, Booking } from '@/api/bookingApi';
import { useLanguage } from '@/context/LanguageContext';

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

const StatusBadge = ({ status }: { status: Booking['status'] }) => (
  <span className={`badge-${status}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
);

const PayBadge = ({ status }: { status: Booking['paymentStatus'] }) => {
  const map = { paid: 'badge-completed', unpaid: 'badge-pending', waived: 'badge-confirmed' } as const;
  return <span className={map[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
};

const AdminBookingsPage = () => {
  const { t } = useLanguage();
  const [bookings, setBookings]     = useState<Booking[]>([]);
  const [total, setTotal]           = useState(0);
  const [filter, setFilter]         = useState<StatusFilter>('all');
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [noteEdit, setNoteEdit]     = useState<{ id: string; text: string } | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  const STATUS_ACTIONS: Record<string, { label: string; next: Booking['status']; color: string }[]> = {
    pending:   [{ label: t('admin.bookings.confirm2'),  next: 'confirmed', color: 'text-blue-400'  }, { label: t('admin.bookings.cancel'), next: 'cancelled', color: 'text-red-400' }],
    confirmed: [{ label: t('admin.bookings.complete'), next: 'completed', color: 'text-green-400' }, { label: t('admin.bookings.cancel'), next: 'cancelled', color: 'text-red-400' }],
    completed: [],
    cancelled: [],
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filter !== 'all') params.status = filter;
      const res = await getAllBookings(params);
      setBookings(res.data.bookings);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load bookings'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleStatus = async (id: string, status: Booking['status']) => {
    try {
      await updateBookingStatus(id, status);
      toast.success(`Booking ${status}`);
      await load();
    } catch { toast.error('Update failed'); }
  };

  const handleSaveNote = async () => {
    if (!noteEdit) return;
    setSavingNote(true);
    try {
      await updateAdminNotes(noteEdit.id, noteEdit.text);
      toast.success('Notes saved');
      setNoteEdit(null);
      await load();
    } catch { toast.error('Save failed'); }
    finally { setSavingNote(false); }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const formatPrice = (cents: number) =>
    cents === 0 ? t('common.free') : `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">{t('admin.bookings.title')}</h1>
          <p className="text-brand-gray-muted mt-1">{total} {t('admin.bookings.total')}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all','pending','confirmed','completed','cancelled'] as StatusFilter[]).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === s ? 'bg-brand-red text-white' : 'bg-brand-gray-light text-brand-gray-muted hover:text-white'
            }`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 card text-brand-gray-muted">
          <Calendar size={36} className="mx-auto mb-3" />
          {t('admin.bookings.noBookings')}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map((b) => {
            const client  = typeof b.client  === 'object' ? b.client  : null;
            const service = typeof b.service === 'object' ? b.service : null;
            const isExp   = expanded === b._id;

            return (
              <div key={b._id} className="card overflow-hidden">
                {/* Summary row */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-brand-gray-light/30 transition-colors"
                  onClick={() => setExpanded(isExp ? null : b._id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-white font-medium">
                        {client ? `${client.firstName} ${client.lastName}` : 'Unknown'}
                      </span>
                      <StatusBadge status={b.status} />
                      <PayBadge status={b.paymentStatus} />
                    </div>
                    <div className="text-sm text-brand-gray-muted flex items-center gap-3 flex-wrap">
                      <span>{service?.title ?? 'Session'}</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> {formatDate(b.scheduledAt)}
                      </span>
                      <span>{formatPrice(b.totalAmount)}</span>
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-brand-gray-muted flex-shrink-0 transition-transform ${isExp ? 'rotate-180' : ''}`} />
                </div>

                {/* Expanded detail */}
                {isExp && (
                  <div className="border-t border-brand-gray-light p-5 bg-brand-gray-light/20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-5">
                      {client && (
                        <div>
                          <p className="text-brand-gray-muted mb-1">{t('admin.bookings.client')}</p>
                          <p className="text-white">{client.firstName} {client.lastName}</p>
                          <p className="text-brand-gray-muted">{client.email}</p>
                          {client.company && <p className="text-brand-gray-muted">{client.company}</p>}
                        </div>
                      )}
                      <div>
                        <p className="text-brand-gray-muted mb-1">{t('admin.bookings.session')}</p>
                        <p className="text-white">{service?.title}</p>
                        <p className="text-brand-gray-muted">{service?.duration} {t('common.min')} · {formatPrice(b.totalAmount)}</p>
                        <p className="text-brand-gray-muted">{formatDate(b.scheduledAt)}</p>
                      </div>
                      {b.notes && (
                        <div className="sm:col-span-2">
                          <p className="text-brand-gray-muted mb-1">{t('admin.bookings.clientNotes')}</p>
                          <p className="text-white bg-brand-gray-light rounded p-2">{b.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Admin Notes */}
                    <div className="mb-5">
                      <p className="text-brand-gray-muted text-sm mb-2 flex items-center gap-1">
                        <MessageSquare size={13} /> {t('admin.bookings.adminNotes')}
                      </p>
                      {noteEdit?.id === b._id ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={noteEdit.text}
                            onChange={(e) => setNoteEdit({ id: b._id, text: e.target.value })}
                            className="input min-h-[60px] text-sm resize-y"
                            placeholder={t('admin.bookings.clickToAddNotes')}
                          />
                          <div className="flex gap-2">
                            <button onClick={handleSaveNote} disabled={savingNote} className="btn-primary text-sm py-1.5">
                              {savingNote ? t('admin.bookings.saving') : <><Check size={13} className="inline mr-1" />{t('common.save')}</>}
                            </button>
                            <button onClick={() => setNoteEdit(null)} className="btn-ghost text-sm py-1.5">
                              <X size={13} className="inline mr-1" />{t('common.cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="text-sm text-white bg-brand-gray-light rounded p-2 cursor-pointer hover:bg-brand-gray-light/80 min-h-[36px]"
                          onClick={() => setNoteEdit({ id: b._id, text: b.adminNotes || '' })}
                        >
                          {b.adminNotes || <span className="text-brand-gray-muted italic">{t('admin.bookings.clickToAddNotes')}</span>}
                        </div>
                      )}
                    </div>

                    {/* Status actions */}
                    {STATUS_ACTIONS[b.status]?.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {STATUS_ACTIONS[b.status].map((action) => (
                          <button
                            key={action.next}
                            onClick={() => handleStatus(b._id, action.next)}
                            className={`btn-ghost text-sm py-1.5 px-3 border border-brand-gray-light ${action.color}`}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminBookingsPage;
