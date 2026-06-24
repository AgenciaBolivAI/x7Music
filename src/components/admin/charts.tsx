/* Lightweight, dependency-free SVG charts for the admin dashboard. */

export function TrendChart({
  values,
  labels,
  kind = 'area',
  color = '#C0392B',
  format = (n: number) => String(n),
  height = 180,
}: {
  values: number[];
  labels: string[];
  kind?: 'area' | 'bar';
  color?: string;
  format?: (n: number) => string;
  height?: number;
}) {
  const W = 600;
  const H = height;
  const padX = 14;
  const padTop = 22;
  const padBottom = 26;
  const plotW = W - padX * 2;
  const plotH = H - padTop - padBottom;
  const n = values.length;
  const max = Math.max(...values, 1);
  const peak = Math.max(...values);
  const x = (i: number) => padX + (n <= 1 ? plotW / 2 : (i * plotW) / (n - 1));
  const y = (v: number) => padTop + plotH - (v / max) * plotH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'auto' }} preserveAspectRatio="xMidYMid meet">
      {/* baseline */}
      <line x1={padX} y1={padTop + plotH} x2={W - padX} y2={padTop + plotH} stroke="#2A2A2A" strokeWidth={1} />
      {kind === 'area' ? (
        <>
          <path
            d={`M ${x(0)} ${y(values[0])} ${values.map((v, i) => `L ${x(i)} ${y(v)}`).join(' ')} L ${x(n - 1)} ${padTop + plotH} L ${x(0)} ${padTop + plotH} Z`}
            fill={color}
            fillOpacity={0.14}
          />
          <polyline
            points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {values.map((v, i) => (
            <circle key={i} cx={x(i)} cy={y(v)} r={v === peak && peak > 0 ? 4 : 3} fill={color} />
          ))}
        </>
      ) : (
        values.map((v, i) => {
          const bw = (plotW / n) * 0.55;
          const bx = x(i) - bw / 2;
          const bh = (v / max) * plotH;
          return <rect key={i} x={bx} y={padTop + plotH - bh} width={bw} height={bh} rx={3} fill={color} fillOpacity={v === peak && peak > 0 ? 1 : 0.55} />;
        })
      )}
      {/* peak value label */}
      {peak > 0 && (
        <text x={x(values.indexOf(peak))} y={y(peak) - 8} fill="#9CA3AF" fontSize={11} textAnchor="middle">{format(peak)}</text>
      )}
      {/* x labels */}
      {labels.map((l, i) => (
        <text key={i} x={x(i)} y={H - 8} fill="#6B7280" fontSize={11} textAnchor="middle">{l}</text>
      ))}
    </svg>
  );
}

export interface DonutSegment { label: string; value: number; color: string }

export function Donut({ segments, size = 150 }: { segments: DonutSegment[]; size?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1F1F1F" strokeWidth={20} />
          {total > 0 && segments.map((s, i) => {
            const len = (s.value / total) * c;
            const el = (
              <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={20}
                strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />
            );
            offset += len;
            return el;
          })}
        </g>
        <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fill="#fff" fontSize={22} fontWeight="700">{total}</text>
        <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fill="#9CA3AF" fontSize={10}>total</text>
      </svg>
      <div className="space-y-1.5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-brand-gray-muted capitalize">{s.label}</span>
            <span className="text-white font-medium ml-auto">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
