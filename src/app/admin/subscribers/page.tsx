'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Trash2, Mail, Send, Sparkles, Users, Check, AlertTriangle } from 'lucide-react';
import {
  getSubscribers,
  deleteSubscriber,
  exportSubscribers,
  sendBroadcast,
  getCampaigns,
  type Subscriber,
  type Campaign,
  type BroadcastInput,
} from '@/api/newsletterApi';
import { getReleases, type Release } from '@/api/releaseApi';
import { getEvents, type Event } from '@/api/eventApi';
import { useLanguage } from '@/context/LanguageContext';

type Audience = 'all' | 'en' | 'es';

const EMPTY_DRAFT: BroadcastInput = {
  subject: '', body: '', audience: 'all', ctaLabel: '', ctaUrl: '',
};

const firstStreamingLink = (r: Release): string | undefined => {
  const links = r.streamingLinks ?? {};
  return links.spotify || Object.values(links).find(Boolean);
};

export default function AdminSubscribersPage() {
  const { t } = useLanguage();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [draft, setDraft] = useState<BroadcastInput>(EMPTY_DRAFT);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    Promise.all([getSubscribers(), getCampaigns()])
      .then(([subs, camps]) => {
        setSubscribers(subs.data.subscribers);
        setCampaigns(camps.data.campaigns);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    // For the "announce a release/event" quick-fill
    getReleases().then((r) => setReleases(r.data.releases)).catch(() => {});
    getEvents().then((r) => setEvents(r.data.events)).catch(() => {});
  }, []);

  const activeCount = useMemo(
    () => (aud: Audience) =>
      subscribers.filter((s) => s.isActive && (aud === 'all' || s.language === aud)).length,
    [subscribers]
  );

  const recipientCount = activeCount(draft.audience);

  const set = (k: keyof BroadcastInput, v: string) => setDraft((p) => ({ ...p, [k]: v }));

  const prefillFromRelease = (id: string) => {
    const r = releases.find((x) => x._id === id);
    if (!r) return;
    const link = firstStreamingLink(r);
    setDraft({
      subject: `🎵 New Release: ${r.title}`,
      body: `${r.artist} just released "${r.title}".\n\n${r.description ?? ''}\n\nListen now on your favorite platform.`,
      audience: 'all',
      ctaLabel: link ? 'Listen Now' : '',
      ctaUrl: link ?? '',
    });
    setResult(null);
  };

  const prefillFromEvent = (id: string) => {
    const e = events.find((x) => x._id === id);
    if (!e) return;
    const when = new Date(e.date).toLocaleString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
    const where = e.location ? `\nWhere: ${e.location}` : '';
    const link = e.ticketLink || e.virtualLink;
    setDraft({
      subject: `📅 Upcoming: ${e.title}`,
      body: `${e.description ?? ''}\n\nWhen: ${when}${where}\n\nWe'd love to see you there!`,
      audience: 'all',
      ctaLabel: link ? (e.ticketLink ? 'Get Tickets' : 'Join Online') : '',
      ctaUrl: link ?? '',
    });
    setResult(null);
  };

  const handleSend = async () => {
    if (!draft.subject.trim() || !draft.body.trim()) return;
    if (!confirm(t('admin.subscribers.confirmSend').replace('{count}', String(recipientCount)))) return;
    setSending(true);
    setResult(null);
    try {
      const payload: BroadcastInput = {
        subject: draft.subject,
        body: draft.body,
        audience: draft.audience,
        ...(draft.ctaLabel && draft.ctaUrl ? { ctaLabel: draft.ctaLabel, ctaUrl: draft.ctaUrl } : {}),
      };
      const res = await sendBroadcast(payload);
      const c = res.data.campaign;
      setResult({
        ok: c.failedCount === 0,
        text: t('admin.subscribers.sendResult')
          .replace('{sent}', String(c.sentCount))
          .replace('{failed}', String(c.failedCount)),
      });
      setCampaigns((prev) => [c, ...prev]);
      setDraft(EMPTY_DRAFT);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setResult({ ok: false, text: msg || t('admin.subscribers.sendError') });
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this subscriber?')) return;
    await deleteSubscriber(id).catch(() => {});
    setSubscribers((prev) => prev.filter((s) => s._id !== id));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await exportSubscribers();
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'x7-subscribers.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const statusBadge = (status: Campaign['status']) => {
    const map: Record<Campaign['status'], string> = {
      sent: 'bg-green-900/50 text-green-400',
      partial: 'bg-yellow-900/50 text-yellow-400',
      failed: 'bg-red-900/50 text-red-400',
    };
    return map[status];
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-heading font-bold text-white">{t('admin.subscribers.title')}</h1>
        <button className="btn-outline flex items-center gap-2 text-sm" onClick={handleExport} disabled={exporting || subscribers.length === 0}>
          <Download size={15} /> {t('admin.subscribers.exportCsv')}
        </button>
      </div>
      <p className="text-brand-gray-muted text-sm mb-6">{t('admin.subscribers.subtitle')}</p>

      {/* ── Compose broadcast ─────────────────────────────────────────────── */}
      <div className="card p-6 mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Send size={18} className="text-brand-red" />
          <h2 className="text-lg font-heading font-semibold text-white">{t('admin.subscribers.composeTitle')}</h2>
        </div>
        <p className="text-brand-gray-muted text-sm mb-5">{t('admin.subscribers.composeSubtitle')}</p>

        {/* Quick-fill from release/event */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 p-4 rounded-lg bg-brand-gray-light/40 border border-white/5">
          <div>
            <label className="label flex items-center gap-1.5"><Sparkles size={13} /> {t('admin.subscribers.announceRelease')}</label>
            <select className="input w-full text-sm" value="" onChange={(e) => e.target.value && prefillFromRelease(e.target.value)}>
              <option value="">{t('admin.subscribers.selectRelease')}</option>
              {releases.map((r) => (
                <option key={r._id} value={r._id}>{r.title} — {r.artist}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label flex items-center gap-1.5"><Sparkles size={13} /> {t('admin.subscribers.announceEvent')}</label>
            <select className="input w-full text-sm" value="" onChange={(e) => e.target.value && prefillFromEvent(e.target.value)}>
              <option value="">{t('admin.subscribers.selectEvent')}</option>
              {events.map((ev) => (
                <option key={ev._id} value={ev._id}>{ev.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">{t('admin.subscribers.subject')}</label>
            <input className="input w-full" value={draft.subject}
              onChange={(e) => set('subject', e.target.value)}
              placeholder={t('admin.subscribers.subjectPlaceholder')} />
          </div>

          <div>
            <label className="label">{t('admin.subscribers.message')}</label>
            <textarea className="input w-full resize-none" rows={7} value={draft.body}
              onChange={(e) => set('body', e.target.value)}
              placeholder={t('admin.subscribers.messagePlaceholder')} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">{t('admin.subscribers.ctaLabel')}</label>
              <input className="input w-full text-sm" value={draft.ctaLabel}
                onChange={(e) => set('ctaLabel', e.target.value)}
                placeholder="e.g. Listen Now" />
            </div>
            <div>
              <label className="label">{t('admin.subscribers.ctaUrl')}</label>
              <input className="input w-full text-sm" value={draft.ctaUrl}
                onChange={(e) => set('ctaUrl', e.target.value)}
                placeholder="https://…" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div>
              <label className="label">{t('admin.subscribers.audience')}</label>
              <select className="input text-sm" value={draft.audience}
                onChange={(e) => set('audience', e.target.value)}>
                <option value="all">{t('admin.subscribers.audAll')} ({activeCount('all')})</option>
                <option value="es">{t('admin.subscribers.audEs')} ({activeCount('es')})</option>
                <option value="en">{t('admin.subscribers.audEn')} ({activeCount('en')})</option>
              </select>
            </div>
            <div className="flex-1 flex items-center gap-2 text-brand-gray-muted text-sm">
              <Users size={15} />
              {t('admin.subscribers.willReach').replace('{count}', String(recipientCount))}
            </div>
            <button
              className="btn-primary flex items-center gap-2"
              onClick={handleSend}
              disabled={sending || recipientCount === 0 || !draft.subject.trim() || !draft.body.trim()}
            >
              <Send size={16} /> {sending ? t('admin.subscribers.sending') : t('admin.subscribers.send')}
            </button>
          </div>

          {result && (
            <div className={`flex items-center gap-2 text-sm rounded-lg px-4 py-3 ${result.ok ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
              {result.ok ? <Check size={15} /> : <AlertTriangle size={15} />} {result.text}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Sent campaigns ──────────────────────────────────────────── */}
          {campaigns.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-heading font-semibold text-white mb-3">{t('admin.subscribers.history')}</h2>
              <div className="card divide-y divide-white/5">
                {campaigns.map((c) => (
                  <div key={c._id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{c.subject}</p>
                      <p className="text-brand-gray-muted text-xs">
                        {new Date(c.createdAt).toLocaleDateString()} · {t('admin.subscribers.sentTo')
                          .replace('{sent}', String(c.sentCount))
                          .replace('{total}', String(c.recipientCount))}
                        {c.failedCount > 0 && ` · ${c.failedCount} ${t('admin.subscribers.failed')}`}
                      </p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full shrink-0 ${statusBadge(c.status)}`}>
                      {t(`admin.subscribers.status.${c.status}`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Subscriber list ─────────────────────────────────────────── */}
          <h2 className="text-lg font-heading font-semibold text-white mb-3">
            {t('admin.subscribers.listTitle')} ({subscribers.length})
          </h2>
          {subscribers.length === 0 ? (
            <div className="card p-12 text-center text-brand-gray-muted">
              <Mail size={36} className="mx-auto mb-3" />
              {t('admin.subscribers.noSubscribers')}
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-brand-gray-muted border-b border-white/10">
                    <th className="px-4 py-3 font-medium">{t('admin.subscribers.email')}</th>
                    <th className="px-4 py-3 font-medium">{t('admin.subscribers.name')}</th>
                    <th className="px-4 py-3 font-medium">{t('admin.subscribers.language')}</th>
                    <th className="px-4 py-3 font-medium">{t('admin.subscribers.statusCol')}</th>
                    <th className="px-4 py-3 font-medium">{t('admin.subscribers.date')}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((s) => (
                    <tr key={s._id} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3 text-white">{s.email}</td>
                      <td className="px-4 py-3 text-brand-gray-muted">{s.name || '—'}</td>
                      <td className="px-4 py-3 text-brand-gray-muted uppercase">{s.language}</td>
                      <td className="px-4 py-3">
                        {s.isActive ? (
                          <span className="text-green-400 text-xs">{t('admin.subscribers.active')}</span>
                        ) : (
                          <span className="text-brand-gray-muted text-xs">{t('admin.subscribers.unsubscribed')}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-brand-gray-muted">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-red-400 hover:text-red-300" onClick={() => handleDelete(s._id)}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
