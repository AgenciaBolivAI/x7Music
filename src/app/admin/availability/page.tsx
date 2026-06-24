'use client';

import { useState, useEffect } from 'react';
import { Save, Trash2, CalendarOff, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getSchedule,
  saveSchedule,
  blockDate,
  unblockDate,
  ScheduleEntry,
  DateBlock,
} from '@/api/availabilityApi';
import { useLanguage } from '@/context/LanguageContext';

const DAYS = [
  { dow: 0, label: 'Sunday' },
  { dow: 1, label: 'Monday' },
  { dow: 2, label: 'Tuesday' },
  { dow: 3, label: 'Wednesday' },
  { dow: 4, label: 'Thursday' },
  { dow: 5, label: 'Friday' },
  { dow: 6, label: 'Saturday' },
];

const DEFAULT_ENTRY = (dow: number): ScheduleEntry => ({
  dayOfWeek: dow, startTime: '09:00', endTime: '18:00',
  isBlocked: false, bufferMinutes: 15,
});

const AdminAvailabilityPage = () => {
  const { t } = useLanguage();
  // Map from dayOfWeek (0-6) → entry or null
  const [schedule, setSchedule] = useState<(ScheduleEntry | null)[]>(Array(7).fill(null));
  const [blocks, setBlocks]     = useState<DateBlock[]>([]);
  const [newDate, setNewDate]   = useState('');
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [blocking, setBlocking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getSchedule();
      const map = Array<ScheduleEntry | null>(7).fill(null);
      res.data.schedules.forEach((e) => { if (e.dayOfWeek !== null) map[e.dayOfWeek] = e; });
      setSchedule(map);
      setBlocks(res.data.blocks);
    } catch { toast.error('Failed to load schedule'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggleDay = (dow: number) => {
    setSchedule((prev) => {
      const next = [...prev];
      next[dow] = next[dow] ? null : DEFAULT_ENTRY(dow);
      return next;
    });
  };

  const updateEntry = (dow: number, key: keyof ScheduleEntry, value: unknown) => {
    setSchedule((prev) => {
      const next = [...prev];
      if (next[dow]) next[dow] = { ...next[dow]!, [key]: value };
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries = schedule.filter((e): e is ScheduleEntry => e !== null);
      await saveSchedule(entries);
      toast.success('Schedule saved!');
      await load();
    } catch { toast.error('Failed to save schedule'); }
    finally { setSaving(false); }
  };

  const handleBlock = async () => {
    if (!newDate) { toast.error('Select a date to block'); return; }
    setBlocking(true);
    try {
      await blockDate(newDate);
      toast.success(`${newDate} blocked`);
      setNewDate('');
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to block date';
      toast.error(msg);
    } finally { setBlocking(false); }
  };

  const handleUnblock = async (id: string, date: string) => {
    try {
      await unblockDate(id);
      toast.success(`${date.slice(0, 10)} unblocked`);
      await load();
    } catch { toast.error('Failed to unblock'); }
  };

  const today = new Date().toISOString().slice(0, 10);

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="section-title">{t('admin.availability.title')}</h1>
        <p className="text-brand-gray-muted mt-1">
          {t('admin.availability.subtitle')}
        </p>
      </div>

      {/* Weekly Schedule */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">{t('admin.availability.weeklyHours')}</h2>
          <div className="flex items-center gap-2 text-xs text-brand-gray-muted">
            <Info size={12} />
            {t('admin.availability.buffer')}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {DAYS.map(({ dow, label }) => {
            const entry = schedule[dow];
            const enabled = entry !== null;
            return (
              <div key={dow} className={`rounded-lg border p-4 transition-colors ${enabled ? 'border-brand-red/40 bg-brand-red/5' : 'border-brand-gray-light bg-brand-gray-light/30'}`}>
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer min-w-[120px]">
                    <input type="checkbox" checked={enabled} onChange={() => toggleDay(dow)}
                      className="w-4 h-4 accent-brand-red" />
                    <span className={`font-medium text-sm ${enabled ? 'text-white' : 'text-brand-gray-muted'}`}>
                      {label}
                    </span>
                  </label>

                  {enabled && (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <label className="text-brand-gray-muted">{t('common.from')}</label>
                        <input type="time" value={entry.startTime}
                          onChange={(e) => updateEntry(dow, 'startTime', e.target.value)}
                          className="input py-1.5 px-2 w-32 text-sm" />
                        <label className="text-brand-gray-muted">{t('common.to')}</label>
                        <input type="time" value={entry.endTime}
                          onChange={(e) => updateEntry(dow, 'endTime', e.target.value)}
                          className="input py-1.5 px-2 w-32 text-sm" />
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <label className="text-brand-gray-muted">{t('common.buffer')}</label>
                        <select value={entry.bufferMinutes}
                          onChange={(e) => updateEntry(dow, 'bufferMinutes', parseInt(e.target.value))}
                          className="input py-1.5 px-2 w-24 text-sm">
                          {[0, 5, 10, 15, 20, 30, 45, 60].map((m) => (
                            <option key={m} value={m}>{m} {t('common.min')}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary mt-6 flex items-center gap-2">
          <Save size={16} />
          {saving ? t('admin.availability.saving') : t('admin.availability.save')}
        </button>
      </div>

      {/* Date Blocks */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <CalendarOff size={18} className="text-brand-red" />
          <h2 className="text-lg font-semibold text-white">{t('admin.availability.blockDates')}</h2>
        </div>
        <p className="text-brand-gray-muted text-sm mb-5">
          {t('admin.availability.blockDatesDesc')}
        </p>

        <div className="flex gap-3 mb-6">
          <input type="date" value={newDate} min={today}
            onChange={(e) => setNewDate(e.target.value)}
            className="input flex-1 max-w-[220px]" />
          <button onClick={handleBlock} disabled={blocking || !newDate} className="btn-primary flex-shrink-0">
            {blocking ? t('admin.availability.blocking') : t('admin.availability.blockDate')}
          </button>
        </div>

        {blocks.length > 0 ? (
          <div className="flex flex-col gap-2">
            {blocks.map((b) => (
              <div key={b._id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-brand-gray-light">
                <span className="text-white text-sm font-mono">
                  {new Date(b.specificDate).toLocaleDateString('en-US', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
                  })}
                </span>
                <button onClick={() => handleUnblock(b._id, b.specificDate)}
                  className="btn-ghost p-1.5 hover:text-brand-red">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-brand-gray-muted text-sm">{t('admin.availability.noDatesBlocked')}</p>
        )}
      </div>
    </div>
  );
};

export default AdminAvailabilityPage;
