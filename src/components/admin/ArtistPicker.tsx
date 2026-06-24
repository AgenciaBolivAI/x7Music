'use client';

import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { Artist } from '@/api/artistApi';

/**
 * Type-ahead combobox for selecting an artist. Filters by name / stage name /
 * legal name; calls onPick with the full Artist (whose profile fields the caller
 * uses to auto-fill a document). Free text is preserved so manual names work too.
 */
export default function ArtistPicker({
  artists,
  onPick,
  placeholder,
  initial = '',
}: {
  artists: Artist[];
  onPick: (a: Artist) => void;
  placeholder?: string;
  initial?: string;
}) {
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const ql = q.trim().toLowerCase();
  const matches = (ql
    ? artists.filter((a) =>
        [a.name, a.stageName, a.legalName].filter(Boolean).some((v) => v!.toLowerCase().includes(ql))
      )
    : artists
  ).slice(0, 8);

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-muted" />
        <input
          className="input w-full text-sm pl-8"
          placeholder={placeholder}
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        />
      </div>
      {open && matches.length > 0 && (
        <div className="absolute z-30 mt-1 w-full bg-brand-gray border border-brand-gray-light rounded-lg shadow-xl max-h-60 overflow-auto">
          {matches.map((a) => (
            <button
              type="button"
              key={a._id}
              className="w-full text-left px-3 py-2 hover:bg-brand-gray-light text-sm"
              onClick={() => { onPick(a); setQ(a.stageName || a.name); setOpen(false); }}
            >
              <span className="text-white">{a.name}</span>
              {a.legalName && a.legalName !== a.name && (
                <span className="text-brand-gray-muted"> · {a.legalName}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
