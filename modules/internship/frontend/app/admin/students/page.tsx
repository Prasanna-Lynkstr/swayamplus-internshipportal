'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { apiFetch, downloadCsv } from '@/lib/api';
import { resolveFileUrl } from '@/lib/files';
import { useTaxonomy } from '@/lib/useTaxonomy';
import { AdminTabs } from '@/components/layout/AdminTabs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import type { PaginatedResult, Student } from '@/lib/types';

const EMPTY_RESULT: PaginatedResult<Student> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 12,
  totalPages: 1,
};

export default function AdminStudentsPage() {
  const { token } = useAuth();
  const categories = useTaxonomy('internship_category');
  const [result, setResult] = useState<PaginatedResult<Student>>(EMPTY_RESULT);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  // Marketing-segmentation filters — collapsed by default so the common
  // case (just search) stays a one-line control, same reasoning as the
  // student browse FilterBar's "More filters" disclosure.
  const [showFilters, setShowFilters] = useState(false);
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [skill, setSkill] = useState('');
  const [gradYearMin, setGradYearMin] = useState('');
  const [gradYearMax, setGradYearMax] = useState('');
  const [profileComplete, setProfileComplete] = useState('');
  const [activity, setActivity] = useState('');

  const buildParams = () => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (city) params.set('city', city);
    if (category) params.set('category', category);
    if (skill) params.set('skill', skill);
    if (gradYearMin) params.set('graduationYearMin', gradYearMin);
    if (gradYearMax) params.set('graduationYearMax', gradYearMax);
    if (profileComplete) params.set('profileComplete', profileComplete);
    if (activity) params.set('activity', activity);
    return params;
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    // Debounced so typing a search term doesn't fire a request per keystroke.
    const timeout = setTimeout(() => {
      const params = buildParams();
      params.set('page', String(page));
      apiFetch<PaginatedResult<Student>>(`/admin/students?${params.toString()}`, { token })
        .then(setResult)
        .catch(() => setError('Could not load students. Please refresh the page.'))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- buildParams reads the same state already listed here
  }, [token, q, city, category, skill, gradYearMin, gradYearMax, profileComplete, activity, page]);

  const handleExport = async () => {
    setExporting(true);
    setExportError('');
    try {
      await downloadCsv(`/admin/students/export?${buildParams().toString()}`, token, 'students.csv');
    } catch {
      setExportError('Could not export. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-sp-navy">Platform administration</h1>
        <p className="mt-1 text-sp-ink-2">Every student registered on the platform.</p>
      </div>

      <AdminTabs />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-sp-ink-2">
            {result.total} student{result.total === 1 ? '' : 's'}
          </span>
          <div className="w-64">
            <Input
              placeholder="Search name, college, or email"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Button variant="secondary" onClick={() => setShowFilters((v) => !v)}>
            {showFilters ? 'Hide filters' : 'More filters'}
          </Button>
          <Button variant="secondary" disabled={exporting} onClick={handleExport}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        </div>

        {showFilters && (
          <Card className="flex flex-wrap items-end gap-3 p-4">
            <div className="w-40">
              <label className="mb-1 block text-xs font-semibold text-sp-ink-3">City</label>
              <Input value={city} onChange={(e) => { setCity(e.target.value); setPage(1); }} />
            </div>
            <div className="w-48">
              <label className="mb-1 block text-xs font-semibold text-sp-ink-3">Preferred category</label>
              <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
                <option value="">Any</option>
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </Select>
            </div>
            <div className="w-40">
              <label className="mb-1 block text-xs font-semibold text-sp-ink-3">Has skill</label>
              <Input placeholder="e.g. React" value={skill} onChange={(e) => { setSkill(e.target.value); setPage(1); }} />
            </div>
            <div className="w-28">
              <label className="mb-1 block text-xs font-semibold text-sp-ink-3">Grad year from</label>
              <Input
                type="number"
                value={gradYearMin}
                onChange={(e) => { setGradYearMin(e.target.value); setPage(1); }}
              />
            </div>
            <div className="w-28">
              <label className="mb-1 block text-xs font-semibold text-sp-ink-3">Grad year to</label>
              <Input
                type="number"
                value={gradYearMax}
                onChange={(e) => { setGradYearMax(e.target.value); setPage(1); }}
              />
            </div>
            <div className="w-40">
              <label className="mb-1 block text-xs font-semibold text-sp-ink-3">Profile</label>
              <Select
                value={profileComplete}
                onChange={(e) => { setProfileComplete(e.target.value); setPage(1); }}
              >
                <option value="">Any</option>
                <option value="true">Complete</option>
                <option value="false">Incomplete</option>
              </Select>
            </div>
            <div className="w-40">
              <label className="mb-1 block text-xs font-semibold text-sp-ink-3">
                Activity (last 30 days)
              </label>
              <Select value={activity} onChange={(e) => { setActivity(e.target.value); setPage(1); }}>
                <option value="">Any</option>
                <option value="active">Active</option>
                <option value="dormant">Dormant</option>
              </Select>
            </div>
          </Card>
        )}

        {exportError && <p className="text-sm font-semibold text-sp-danger">{exportError}</p>}
      </div>

      {error && <p className="text-sm font-semibold text-sp-danger">{error}</p>}

      {loading ? (
        <p className="text-sp-ink-3">Loading…</p>
      ) : result.items.length === 0 ? (
        <Card className="p-10 text-center text-sp-ink-3">No students registered yet.</Card>
      ) : (
        <div className="flex flex-col gap-4">
          {result.items.map((student) => (
            <Card key={student.id} className="flex flex-wrap items-start justify-between gap-4 p-6">
              <div>
                <h3 className="font-bold text-sp-navy">
                  {student.fullName ?? <span className="text-sp-ink-3">Profile incomplete</span>}
                </h3>
                <p className="text-sm text-sp-ink-3">
                  {student.user?.identifier}
                  {student.collegeName ? ` · ${student.collegeName}` : ''}
                  {student.course ? ` · ${student.course}` : ''}
                  {student.city ? ` · ${student.city}` : ''}
                </p>
                <p className="text-xs text-sp-ink-3">
                  Profile created on {new Date(student.createdAt).toLocaleDateString('en-IN')}
                </p>
                {student.skills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {student.skills.map((skill) => (
                      <Badge key={skill}>{skill}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 text-sm">
                {student.resumeUrl && (
                  <a
                    href={resolveFileUrl(student.resumeUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-sp-blue"
                  >
                    View resume
                  </a>
                )}
                {student.linkedinUrl && (
                  <a
                    href={student.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-sp-blue"
                  >
                    LinkedIn
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {result.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Prev
          </Button>
          <span className="text-sm text-sp-ink-2">
            Page {result.page} of {result.totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= result.totalPages}
            onClick={() => setPage((p) => Math.min(result.totalPages, p + 1))}
          >
            Next →
          </Button>
        </div>
      )}
    </div>
  );
}
