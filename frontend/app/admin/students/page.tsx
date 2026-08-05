'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { resolveFileUrl } from '@/lib/files';
import { AdminTabs } from '@/components/layout/AdminTabs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
  const [result, setResult] = useState<PaginatedResult<Student>>(EMPTY_RESULT);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    // Debounced so typing a search term doesn't fire a request per keystroke.
    const timeout = setTimeout(() => {
      const params = new URLSearchParams({ page: String(page) });
      if (q) params.set('q', q);
      apiFetch<PaginatedResult<Student>>(`/admin/students?${params.toString()}`, { token })
        .then(setResult)
        .catch(() => setError('Could not load students. Please refresh the page.'))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [token, q, page]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-sp-navy">Platform administration</h1>
        <p className="mt-1 text-sp-ink-2">Every student registered on the platform.</p>
      </div>

      <AdminTabs />

      <div className="flex items-center gap-3">
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
