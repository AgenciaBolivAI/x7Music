'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Check, PenLine, Eraser, Loader2, AlertTriangle, FileText } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface SignerView {
  agreement: { type: string; title: string; status: string };
  signer: { name: string; email: string; role: string | null; status: string; signedAt: string | null };
  signers: { name: string; role: string | null; status: string }[];
}

export default function SignPage() {
  const { t } = useLanguage();
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [view, setView] = useState<SignerView | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [typed, setTyped] = useState('');
  const [legalName, setLegalName] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);

  useEffect(() => {
    fetch(`/api/sign/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) { setInvalid(true); return; }
        setView(d);
        setLegalName(d.signer.name || '');
        if (d.signer.status === 'signed') setDone(true);
      })
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [token]);

  // ── Canvas drawing ──────────────────────────────────────────────────────────
  const ctx = () => canvasRef.current?.getContext('2d') ?? null;
  const start = (e: React.PointerEvent) => {
    const c = ctx(); if (!c) return;
    drawing.current = true;
    c.beginPath();
    c.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const c = ctx(); if (!c) return;
    c.lineWidth = 2.5; c.lineCap = 'round'; c.strokeStyle = '#0A0A0A';
    c.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    c.stroke();
    hasInk.current = true;
  };
  const end = () => { drawing.current = false; };
  const clearCanvas = () => {
    const c = ctx(); const cv = canvasRef.current;
    if (c && cv) c.clearRect(0, 0, cv.width, cv.height);
    hasInk.current = false;
  };

  const renderTyped = (text: string) => {
    const c = ctx(); const cv = canvasRef.current;
    if (!c || !cv) return;
    c.clearRect(0, 0, cv.width, cv.height);
    c.fillStyle = '#0A0A0A';
    c.font = 'italic 44px Georgia, "Times New Roman", serif';
    c.textBaseline = 'middle';
    c.fillText(text, 16, cv.height / 2);
    hasInk.current = text.trim().length > 0;
  };

  const submit = async () => {
    const cv = canvasRef.current;
    if (!cv || !hasInk.current) return;
    if (!legalName.trim()) return;
    setSubmitting(true);
    try {
      const signatureData = cv.toDataURL('image/png');
      const r = await fetch(`/api/sign/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureData, signedName: legalName.trim() }),
      });
      const d = await r.json();
      if (d.success) setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <main className="min-h-screen bg-brand-black px-4 py-10 flex flex-col items-center">
      <div className="mb-8 inline-flex items-center gap-2">
        <span className="font-heading text-2xl font-bold text-white">X7</span>
        <span className="font-heading text-2xl font-bold text-brand-red">·</span>
        <span className="font-heading text-2xl font-bold text-white">Music Group</span>
      </div>
      {children}
    </main>
  );

  if (loading) return <Shell><Loader2 className="animate-spin text-brand-red" size={32} /></Shell>;

  if (invalid || !view) return (
    <Shell>
      <div className="card p-8 max-w-md text-center">
        <AlertTriangle className="mx-auto mb-3 text-brand-red" size={34} />
        <h1 className="text-xl font-heading font-bold text-white mb-2">{t('sign.invalidTitle')}</h1>
        <p className="text-brand-gray-muted text-sm">{t('sign.invalidBody')}</p>
      </div>
    </Shell>
  );

  if (done) return (
    <Shell>
      <div className="card p-8 max-w-md text-center">
        <div className="w-14 h-14 rounded-full bg-green-900/40 flex items-center justify-center mx-auto mb-4">
          <Check className="text-green-400" size={30} />
        </div>
        <h1 className="text-xl font-heading font-bold text-white mb-2">{t('sign.doneTitle')}</h1>
        <p className="text-brand-gray-muted text-sm mb-5">{t('sign.doneBody')}</p>
        <a className="btn-outline text-sm inline-flex items-center gap-1.5" href={`/api/sign/${token}/pdf`} target="_blank" rel="noreferrer">
          <FileText size={15} /> {t('sign.viewDoc')}
        </a>
      </div>
    </Shell>
  );

  return (
    <Shell>
      <div className="w-full max-w-3xl space-y-6">
        <div>
          <p className="text-brand-gray-muted text-sm">{t('sign.requestedOf')} {view.signer.name}{view.signer.role ? ` · ${view.signer.role}` : ''}</p>
          <h1 className="text-2xl font-heading font-bold text-white mt-1">{view.agreement.title}</h1>
        </div>

        {/* Document preview */}
        <div className="card overflow-hidden">
          <iframe src={`/api/sign/${token}/pdf`} title="document" className="w-full h-[55vh] bg-white" />
        </div>

        {/* Signature pad */}
        <div className="card p-5">
          <p className="label flex items-center gap-1.5 mb-3"><PenLine size={15} /> {t('sign.yourSignature')}</p>

          <div className="flex gap-2 mb-3">
            {(['draw', 'type'] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); clearCanvas(); if (m === 'type') renderTyped(typed); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${mode === m ? 'bg-brand-red text-white' : 'bg-brand-gray-light text-brand-gray-muted'}`}>
                {t(`sign.${m}`)}
              </button>
            ))}
          </div>

          {mode === 'type' && (
            <input className="input w-full text-sm mb-3" placeholder={t('sign.typePlaceholder')} value={typed}
              onChange={(e) => { setTyped(e.target.value); renderTyped(e.target.value); }} />
          )}

          <div className="rounded-lg bg-white overflow-hidden">
            <canvas
              ref={canvasRef}
              width={680}
              height={180}
              className="w-full touch-none cursor-crosshair"
              style={{ height: 180 }}
              onPointerDown={mode === 'draw' ? start : undefined}
              onPointerMove={mode === 'draw' ? move : undefined}
              onPointerUp={end}
              onPointerLeave={end}
            />
          </div>
          <button className="text-brand-gray-muted hover:text-white text-xs flex items-center gap-1 mt-2" onClick={() => { clearCanvas(); if (mode === 'type') setTyped(''); }}>
            <Eraser size={13} /> {t('sign.clear')}
          </button>

          <div className="mt-4">
            <label className="label">{t('sign.legalName')}</label>
            <input className="input w-full text-sm" value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder={t('sign.legalNamePlaceholder')} />
          </div>

          <p className="text-brand-gray-muted text-xs mt-3">{t('sign.consent')}</p>

          <button className="btn-primary w-full mt-4 flex items-center justify-center gap-2" disabled={submitting} onClick={submit}>
            {submitting ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
            {submitting ? t('sign.submitting') : t('sign.submit')}
          </button>
        </div>
      </div>
    </Shell>
  );
}
