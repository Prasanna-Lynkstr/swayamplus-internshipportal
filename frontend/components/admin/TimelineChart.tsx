'use client';

import { useMemo, useState } from 'react';
import type { DashboardTimeline } from '@/lib/types';

// Fixed-order categorical slots 1-4 (blue/orange/aqua/yellow) from the
// validated default dataviz palette — passes CVD/contrast checks for
// adjacent-pair line charts at this series count (see dataviz skill,
// references/palette.md). The light-mode WARN on aqua/yellow contrast is
// mitigated by the always-visible legend + tooltip text (never color alone).
const SERIES = [
  { key: 'studentsCreated', label: 'Student profiles created', color: '#2a78d6' },
  { key: 'employersRegistered', label: 'Employers registered', color: '#eb6834' },
  { key: 'internshipsPosted', label: 'Internships posted', color: '#1baf7a' },
  { key: 'internshipsOffered', label: 'Internships offered', color: '#eda100' },
] as const;

const VIEW_W = 800;
const VIEW_H = 320;
const PAD = { top: 16, right: 16, bottom: 32, left: 44 };
const CHART_W = VIEW_W - PAD.left - PAD.right;
const CHART_H = VIEW_H - PAD.top - PAD.bottom;

function niceMax(value: number): number {
  if (value <= 0) return 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

function formatBucketLabel(iso: string, granularity: DashboardTimeline['granularity']): string {
  const d = new Date(iso);
  if (granularity === 'month') {
    return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export function TimelineChart({ data }: { data: DashboardTimeline }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { buckets, series, granularity } = data;
  const n = buckets.length;

  const xAt = (i: number) => PAD.left + (n <= 1 ? CHART_W / 2 : (i / (n - 1)) * CHART_W);

  const maxValue = useMemo(() => {
    let max = 0;
    for (const s of SERIES) {
      for (const v of series[s.key]) max = Math.max(max, v);
    }
    return niceMax(max);
  }, [series]);

  const yAt = (v: number) => PAD.top + CHART_H - (v / maxValue) * CHART_H;

  const gridSteps = 4;
  const gridValues = Array.from({ length: gridSteps + 1 }, (_, i) => (maxValue / gridSteps) * i);

  const maxLabels = 7;
  const labelStep = Math.max(1, Math.ceil(n / maxLabels));
  const labelIndices = new Set<number>();
  for (let i = 0; i < n; i += labelStep) labelIndices.add(i);
  if (n > 0) labelIndices.add(n - 1);

  const totals = useMemo(
    () => SERIES.map((s) => series[s.key].reduce((sum, v) => sum + v, 0)),
    [series],
  );

  const handlePointerMove = (e: React.PointerEvent<SVGRectElement>) => {
    if (n === 0) return;
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    const ratio = n <= 1 ? 0 : (relX - PAD.left) / CHART_W;
    const index = Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1))));
    setHoverIndex(index);
  };

  const hoverX = hoverIndex !== null ? xAt(hoverIndex) : null;
  const tooltipSide = hoverX !== null && hoverX > VIEW_W * 0.65 ? 'left' : 'right';

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full" style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}>
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="h-full w-full"
          role="img"
          aria-label="Platform activity over the selected period"
        >
          {/* gridlines + y-axis ticks */}
          {gridValues.map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                x2={VIEW_W - PAD.right}
                y1={yAt(v)}
                y2={yAt(v)}
                stroke="rgba(13,17,27,0.08)"
                strokeWidth={1}
              />
              <text x={PAD.left - 8} y={yAt(v)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="#6e7279">
                {Math.round(v).toLocaleString('en-IN')}
              </text>
            </g>
          ))}

          {/* x-axis labels */}
          {[...labelIndices].map((i) => (
            <text
              key={i}
              x={xAt(i)}
              y={VIEW_H - PAD.bottom + 20}
              textAnchor="middle"
              fontSize={11}
              fill="#6e7279"
            >
              {formatBucketLabel(buckets[i], granularity)}
            </text>
          ))}

          {/* series lines */}
          {SERIES.map((s) => {
            const values = series[s.key];
            const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(v)}`).join(' ');
            const lastIndex = values.length - 1;
            return (
              <g key={s.key}>
                <path d={path} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {lastIndex >= 0 && (
                  <circle cx={xAt(lastIndex)} cy={yAt(values[lastIndex])} r={5} fill={s.color} stroke="#ffffff" strokeWidth={2} />
                )}
                {hoverIndex !== null && (
                  <circle cx={xAt(hoverIndex)} cy={yAt(values[hoverIndex])} r={5} fill={s.color} stroke="#ffffff" strokeWidth={2} />
                )}
              </g>
            );
          })}

          {/* crosshair */}
          {hoverX !== null && (
            <line x1={hoverX} x2={hoverX} y1={PAD.top} y2={VIEW_H - PAD.bottom} stroke="#c3c2b7" strokeWidth={1} />
          )}

          {/* hover hit target — covers the whole chart area, snaps to nearest bucket */}
          <rect
            x={PAD.left}
            y={PAD.top}
            width={CHART_W}
            height={CHART_H}
            fill="transparent"
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHoverIndex(null)}
          />
        </svg>

        {hoverIndex !== null && hoverX !== null && (
          <div
            className="pointer-events-none absolute top-2 rounded-sp-md border border-black/5 bg-sp-navy px-3 py-2 text-white shadow-lg shadow-black/20"
            style={{
              left: `${(hoverX / VIEW_W) * 100}%`,
              transform: tooltipSide === 'left' ? 'translateX(-100%)' : 'translateX(0)',
              marginLeft: tooltipSide === 'left' ? -12 : 12,
            }}
          >
            <p className="mb-1 text-xs font-bold text-white/70">
              {formatBucketLabel(buckets[hoverIndex], granularity)}
            </p>
            <div className="flex flex-col gap-0.5">
              {SERIES.map((s) => (
                <div key={s.key} className="flex items-center gap-2 text-xs">
                  <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="font-extrabold tabular-nums">{series[s.key][hoverIndex]}</span>
                  <span className="text-white/70">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* legend — always-visible text labels double as the contrast relief
          for the two light-mode WARN slots (aqua/yellow), and the totals
          give the at-a-glance numbers the chart trend doesn't. */}
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {SERIES.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2 text-sm">
            <span className="h-0.5 w-4 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="font-bold text-sp-navy">{totals[i].toLocaleString('en-IN')}</span>
            <span className="text-sp-ink-3">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
