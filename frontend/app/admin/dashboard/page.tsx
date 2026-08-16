'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AdminTabs } from '@/components/layout/AdminTabs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { TimelineChart } from '@/components/admin/TimelineChart';
import type { AdminDashboardStats, DashboardTimeline } from '@/lib/types';

type RangePreset = 'last30' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

const RANGE_PRESETS: { key: RangePreset; label: string }[] = [
  { key: 'last30', label: 'Last 30 days' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'quarter', label: 'This quarter' },
  { key: 'year', label: 'This year' },
  { key: 'custom', label: 'Custom' },
];

// Presets before custom range, all scoping the same timeline below — see
// dataviz skill, references/interaction.md § Filters & time ranges.
function computeRange(
  preset: RangePreset,
  customFrom: string,
  customTo: string,
): { from: Date; to: Date } | null {
  const now = new Date();
  if (preset === 'last30') {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { from, to: now };
  }
  if (preset === 'week') {
    const from = new Date(now);
    const day = from.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    from.setDate(from.getDate() - diffToMonday);
    from.setHours(0, 0, 0, 0);
    return { from, to: now };
  }
  if (preset === 'month') {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  }
  if (preset === 'quarter') {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    return { from: new Date(now.getFullYear(), quarterStartMonth, 1), to: now };
  }
  if (preset === 'year') {
    return { from: new Date(now.getFullYear(), 0, 1), to: now };
  }
  // custom
  if (!customFrom || !customTo) return null;
  const from = new Date(customFrom);
  const to = new Date(customTo);
  to.setHours(23, 59, 59, 999);
  if (from > to) return null;
  return { from, to };
}

function MetricCard({
  pastel,
  label,
  value,
  sublabel,
}: {
  pastel: 'yellow' | 'peach' | 'lavender' | 'mint';
  label: string;
  value: number;
  sublabel?: string;
}) {
  return (
    <Card pastel={pastel} className="p-6">
      <p className="text-sm font-bold uppercase tracking-wide text-sp-ink-2">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-sp-navy">{value.toLocaleString('en-IN')}</p>
      {sublabel && <p className="mt-1 text-xs font-semibold text-sp-ink-3">{sublabel}</p>}
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [rangePreset, setRangePreset] = useState<RangePreset>('last30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [timeline, setTimeline] = useState<DashboardTimeline | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    apiFetch<AdminDashboardStats>('/admin/dashboard', { token })
      .then(setStats)
      .catch(() => setError('Could not load dashboard stats. Please refresh the page.'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const range = computeRange(rangePreset, customFrom, customTo);
    if (!range) {
      if (rangePreset === 'custom') setTimelineError('Pick a valid date range (from must be before to).');
      return;
    }
    setTimelineError('');
    setTimelineLoading(true);
    const params = new URLSearchParams({ from: range.from.toISOString(), to: range.to.toISOString() });
    apiFetch<DashboardTimeline>(`/admin/dashboard/timeline?${params.toString()}`, { token })
      .then(setTimeline)
      .catch(() => setTimelineError('Could not load the activity timeline. Please try again.'))
      .finally(() => setTimelineLoading(false));
  }, [token, rangePreset, customFrom, customTo]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-sp-navy">Platform administration</h1>
        <p className="mt-1 text-sp-ink-2">Ecosystem overview and quick actions.</p>
      </div>

      <AdminTabs />

      {loading ? (
        <p className="text-sp-ink-3">Loading…</p>
      ) : error ? (
        <p className="text-sm font-semibold text-sp-danger">{error}</p>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              pastel="yellow"
              label="Students"
              value={stats.students.total}
              sublabel={`+${stats.students.newLast7Days} in the last 7 days`}
            />
            <MetricCard
              pastel="peach"
              label="Employers"
              value={stats.employers.total}
              sublabel={`+${stats.employers.newLast7Days} in the last 7 days`}
            />
            <MetricCard
              pastel="lavender"
              label="Internships"
              value={stats.internships.total}
              sublabel={`${stats.internships.published} published`}
            />
            <MetricCard
              pastel="mint"
              label="Applications"
              value={stats.applications.total}
              sublabel="Total submitted"
            />
          </div>

          <div>
            <h2 className="mb-4 text-lg font-bold text-sp-navy">Activity over time</h2>
            <Card className="p-6">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                {RANGE_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setRangePreset(p.key)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-bold transition-colors ${
                      rangePreset === p.key
                        ? 'border-sp-navy bg-sp-navy text-white'
                        : 'border-black/10 bg-sp-bg-elev text-sp-ink-2 hover:border-sp-orange/40'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
                {rangePreset === 'custom' && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="w-40"
                    />
                    <span className="text-sm text-sp-ink-3">to</span>
                    <Input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="w-40"
                    />
                  </div>
                )}
              </div>

              {timelineError ? (
                <p className="text-sm font-semibold text-sp-danger">{timelineError}</p>
              ) : timelineLoading && !timeline ? (
                <p className="text-sp-ink-3">Loading…</p>
              ) : timeline ? (
                <div className={timelineLoading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                  <TimelineChart data={timeline} />
                </div>
              ) : null}
            </Card>
          </div>

          <div>
            <h2 className="mb-4 text-lg font-bold text-sp-navy">Breakdown</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card className="p-6">
                <h3 className="mb-3 font-bold text-sp-navy">Employers by status</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="orange">Pending {stats.employers.pending}</Badge>
                  <Badge tone="good">Approved {stats.employers.approved}</Badge>
                  <Badge tone="danger">Rejected {stats.employers.rejected}</Badge>
                </div>
              </Card>
              <Card className="p-6">
                <h3 className="mb-3 font-bold text-sp-navy">Internships by status</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge>Draft {stats.internships.draft}</Badge>
                  <Badge tone="orange">Pending review {stats.internships.pending_review}</Badge>
                  <Badge tone="good">Published {stats.internships.published}</Badge>
                  <Badge tone="danger">Closed {stats.internships.closed}</Badge>
                  <Badge>Archived {stats.internships.archived}</Badge>
                </div>
              </Card>
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-lg font-bold text-sp-navy">Needs your attention</h2>
            <div className="flex flex-col gap-3">
              <Link
                href="/admin/employers"
                className="flex items-center justify-between gap-4 rounded-sp-xl border border-black/5 bg-white p-5 shadow-sm shadow-black/5 hover:border-sp-orange/40"
              >
                <div>
                  <p className="font-bold text-sp-navy">
                    {stats.employers.pending} employer{stats.employers.pending === 1 ? '' : 's'} awaiting
                    verification
                  </p>
                  <p className="text-sm text-sp-ink-3">Review documents and approve or reject.</p>
                </div>
                <span className="text-sp-orange">→</span>
              </Link>

              <Link
                href="/admin/requests"
                className="flex items-center justify-between gap-4 rounded-sp-xl border border-black/5 bg-white p-5 shadow-sm shadow-black/5 hover:border-sp-orange/40"
              >
                <div>
                  <p className="font-bold text-sp-navy">
                    {stats.internshipRequests.total} internship request
                    {stats.internshipRequests.total === 1 ? '' : 's'} logged
                  </p>
                  <p className="text-sm text-sp-ink-3">
                    Categories and roles students couldn&apos;t find a match for.
                  </p>
                </div>
                <span className="text-sp-orange">→</span>
              </Link>

              <Link
                href="/admin/settings"
                className="flex items-center justify-between gap-4 rounded-sp-xl border border-black/5 bg-white p-5 shadow-sm shadow-black/5 hover:border-sp-orange/40"
              >
                <div>
                  <p className="font-bold text-sp-navy">
                    Employer registration is currently{' '}
                    {stats.employerRegistrationOpen ? 'open' : 'closed'}
                  </p>
                  <p className="text-sm text-sp-ink-3">Manage platform-wide settings.</p>
                </div>
                <span className="text-sp-orange">→</span>
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
