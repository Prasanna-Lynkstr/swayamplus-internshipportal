'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { apiFetch, downloadCsv } from '@/lib/api';
import { resolveFileUrl } from '@/lib/files';
import { AdminTabs } from '@/components/layout/AdminTabs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { EmployerEoiModal } from '@/components/admin/EmployerEoiModal';
import { EMPLOYER_VERIFICATION_STATUS_TONE, STATUS_TONE_BORDER } from '@/lib/status-labels';
import type { Employer, PaginatedResult } from '@/lib/types';

const EMPTY_RESULT: PaginatedResult<Employer> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 12,
  totalPages: 1,
};

export default function AdminEmployersPage() {
  const { token } = useAuth();
  const [result, setResult] = useState<PaginatedResult<Employer>>(EMPTY_RESULT);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  // Separate from actionError: a load failure means there's no data to show,
  // so it's fine to replace the whole page with it. An action failure (below)
  // happens after data is already loaded and should never hide that data.
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [viewingEmployer, setViewingEmployer] = useState<Employer | null>(null);

  // Marketing-segmentation filters — collapsed by default, same reasoning as
  // the admin Students page's "More filters" disclosure.
  const [showFilters, setShowFilters] = useState(false);
  const [hqCity, setHqCity] = useState('');
  const [industryTags, setIndustryTags] = useState('');
  const [activation, setActivation] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const buildParams = () => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (q) params.set('q', q);
    if (hqCity) params.set('hqCity', hqCity);
    if (industryTags) params.set('industryTags', industryTags);
    if (activation) params.set('activation', activation);
    return params;
  };

  const load = () => {
    if (!token) return;
    setLoading(true);
    setLoadError('');
    const params = buildParams();
    params.set('page', String(page));
    apiFetch<PaginatedResult<Employer>>(`/admin/employers?${params.toString()}`, { token })
      .then(setResult)
      .catch(() => setLoadError('Could not load employers. Please refresh the page.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token) return;
    // Debounced so typing a search term doesn't fire a request per keystroke.
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load() reads the same state already listed here
  }, [token, status, q, hqCity, industryTags, activation, page]);

  const handleExport = async () => {
    setExporting(true);
    setExportError('');
    try {
      await downloadCsv(`/admin/employers/export?${buildParams().toString()}`, token, 'employers.csv');
    } catch {
      setExportError('Could not export. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const toggleModerationMode = async (employer: Employer) => {
    setActionError('');
    try {
      await apiFetch(`/admin/employers/${employer.id}/moderation`, {
        method: 'PATCH',
        token,
        body: {
          moderationMode: employer.moderationMode === 'review' ? 'auto_publish' : 'review',
        },
      });
      load();
    } catch {
      setActionError('Could not update this employer. Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-sp-navy">Platform administration</h1>
        <p className="mt-1 text-sp-ink-2">
          Directory of platform employers — every account is created already-approved via
          Expression of Interest review. Set per-employer posting moderation here.
        </p>
      </div>

      <AdminTabs />

      {loading ? (
        <p className="text-sp-ink-3">Loading…</p>
      ) : loadError ? (
        <p className="text-sm font-semibold text-sp-danger">{loadError}</p>
      ) : (
        <>
          {actionError && <p className="text-sm font-semibold text-sp-danger">{actionError}</p>}

          <div>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-bold text-sp-navy">Employers ({result.total})</h2>
              <div className="w-44">
                <Select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending (legacy)</option>
                  <option value="rejected">Rejected</option>
                </Select>
              </div>
              <div className="w-64">
                <Input
                  placeholder="Search organization or email"
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
              <Card className="mb-4 flex flex-wrap items-end gap-3 p-4">
                <div className="w-40">
                  <label className="mb-1 block text-xs font-semibold text-sp-ink-3">HQ city</label>
                  <Input value={hqCity} onChange={(e) => { setHqCity(e.target.value); setPage(1); }} />
                </div>
                <div className="w-48">
                  <label className="mb-1 block text-xs font-semibold text-sp-ink-3">Industry tags</label>
                  <Input
                    placeholder="e.g. Fintech, EdTech"
                    value={industryTags}
                    onChange={(e) => { setIndustryTags(e.target.value); setPage(1); }}
                  />
                </div>
                <div className="w-52">
                  <label className="mb-1 block text-xs font-semibold text-sp-ink-3">Activation status</label>
                  <Select value={activation} onChange={(e) => { setActivation(e.target.value); setPage(1); }}>
                    <option value="">Any</option>
                    <option value="never_posted">Never posted</option>
                    <option value="zero_applicants">Posted, zero applicants</option>
                    <option value="actively_hiring">Actively hiring (2+ live roles)</option>
                    <option value="dormant">Dormant (30+ days quiet)</option>
                    <option value="active">Active</option>
                  </Select>
                </div>
              </Card>
            )}

            {exportError && <p className="mb-4 text-sm font-semibold text-sp-danger">{exportError}</p>}

            {result.items.length === 0 ? (
              <Card className="p-10 text-center text-sp-ink-3">No employers match this filter.</Card>
            ) : (
              <div className="flex flex-col gap-4">
                {result.items.map((employer) => (
                  <Card
                    key={employer.id}
                    className={`flex flex-wrap items-center justify-between gap-4 p-6 ${STATUS_TONE_BORDER[EMPLOYER_VERIFICATION_STATUS_TONE[employer.verificationStatus]]}`}
                  >
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingEmployer(employer)}
                          className="font-bold text-sp-navy underline decoration-dotted underline-offset-2 hover:text-sp-blue"
                        >
                          {employer.organizationName}
                        </button>
                        <Badge tone={EMPLOYER_VERIFICATION_STATUS_TONE[employer.verificationStatus]}>
                          {employer.verificationStatus}
                        </Badge>
                        {employer.moderationMode === 'review' && (
                          <Badge tone="orange">postings need review</Badge>
                        )}
                      </div>
                      <p className="text-sm text-sp-ink-3">
                        {employer.user?.identifier} · {employer.hqCity ?? 'City not set'}
                        {employer.cin ? ` · CIN ${employer.cin}` : ''}
                        {employer.headcount ? ` · ${employer.headcount} employees` : ''}
                      </p>
                      <p className="text-xs text-sp-ink-3">
                        Applied on {new Date(employer.createdAt).toLocaleDateString('en-IN')}
                      </p>
                      {(employer.contactPersonName || employer.contactPersonPhone) && (
                        <p className="mt-1 text-sm font-bold text-sp-navy">
                          Applied by: {employer.contactPersonName ?? 'Not set'}
                          {employer.contactPersonPhone ? ` · ${employer.contactPersonPhone}` : ''}
                        </p>
                      )}
                      {employer.reasonForEoi && (
                        <p className="mt-1 max-w-xl text-sm text-sp-ink-2">
                          &ldquo;{employer.reasonForEoi}&rdquo;
                        </p>
                      )}
                      {employer.internshipTypesExpected.length > 0 && (
                        <p className="mt-1 text-xs text-sp-ink-3">
                          Expects: {employer.internshipTypesExpected.join(', ')}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-3">
                        {employer.certificateOfIncorporationUrl ? (
                          <a
                            href={resolveFileUrl(employer.certificateOfIncorporationUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-sp-blue"
                          >
                            View Certificate of Incorporation
                          </a>
                        ) : (
                          <p className="text-sm text-sp-ink-3">No certificate uploaded yet.</p>
                        )}
                        {employer.linkedinBusinessPage && (
                          <a
                            href={employer.linkedinBusinessPage}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-sp-blue"
                          >
                            LinkedIn page
                          </a>
                        )}
                        {employer.website && (
                          <a
                            href={employer.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-sp-blue"
                          >
                            Website
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Button variant="secondary" onClick={() => setViewingEmployer(employer)}>
                        View details
                      </Button>
                      {employer.verificationStatus === 'approved' && (
                        <Button variant="secondary" onClick={() => toggleModerationMode(employer)}>
                          {employer.moderationMode === 'review'
                            ? 'Switch to auto-publish'
                            : 'Require posting review'}
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
            {result.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-3">
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
        </>
      )}

      <EmployerEoiModal
        employer={viewingEmployer}
        onClose={() => setViewingEmployer(null)}
      />
    </div>
  );
}
