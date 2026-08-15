'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AdminTabs } from '@/components/layout/AdminTabs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { AdminDashboardStats } from '@/lib/types';

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

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    apiFetch<AdminDashboardStats>('/admin/dashboard', { token })
      .then(setStats)
      .catch(() => setError('Could not load dashboard stats. Please refresh the page.'))
      .finally(() => setLoading(false));
  }, [token]);

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
