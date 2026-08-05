'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { resolveFileUrl } from '@/lib/files';
import { AdminTabs } from '@/components/layout/AdminTabs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Employer, PlatformSettings } from '@/lib/types';

export default function AdminEmployersPage() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [pending, setPending] = useState<Employer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError('');
    Promise.all([
      apiFetch<PlatformSettings>('/admin/settings', { token }),
      apiFetch<Employer[]>('/admin/employers/pending', { token }),
    ])
      .then(([s, p]) => {
        setSettings(s);
        setPending(p);
      })
      .catch(() => setError('Could not load admin data. Please refresh the page.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const toggleRegistration = async () => {
    if (!settings) return;
    try {
      const updated = await apiFetch<PlatformSettings>('/admin/settings', {
        method: 'PATCH',
        token,
        body: { employerRegistrationOpen: !settings.employerRegistrationOpen },
      });
      setSettings(updated);
    } catch {
      setError('Could not update settings. Please try again.');
    }
  };

  const decide = async (employerId: number, status: 'approved' | 'rejected') => {
    try {
      await apiFetch(`/admin/employers/${employerId}/verify`, {
        method: 'PATCH',
        token,
        body: { status },
      });
      load();
    } catch {
      setError('Could not update this employer. Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-sp-navy">Platform administration</h1>
        <p className="mt-1 text-sp-ink-2">Approve employers and control platform-wide settings.</p>
      </div>

      <AdminTabs />

      {loading ? (
        <p className="text-sp-ink-3">Loading…</p>
      ) : error ? (
        <p className="text-sm font-semibold text-sp-danger">{error}</p>
      ) : (
        <>
      <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="text-lg font-bold text-sp-navy">Employer registration</h2>
          <p className="text-sm text-sp-ink-2">
            {settings?.employerRegistrationOpen
              ? 'New employers can currently self-register.'
              : 'Employer registration is closed to new sign-ups.'}
          </p>
        </div>
        <Button variant={settings?.employerRegistrationOpen ? 'secondary' : 'primary'} onClick={toggleRegistration}>
          {settings?.employerRegistrationOpen ? 'Close registration' : 'Open registration'}
        </Button>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-bold text-sp-navy">Pending verification ({pending.length})</h2>
        {pending.length === 0 ? (
          <Card className="p-10 text-center text-sp-ink-3">No employers awaiting review.</Card>
        ) : (
          <div className="flex flex-col gap-4">
            {pending.map((employer) => (
              <Card key={employer.id} className="flex flex-wrap items-center justify-between gap-4 p-6">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="font-bold text-sp-navy">{employer.organizationName}</h3>
                    <Badge tone="orange">{employer.verificationStatus}</Badge>
                  </div>
                  <p className="text-sm text-sp-ink-3">
                    {employer.user?.identifier} · {employer.hqCity ?? 'City not set'}
                  </p>
                  {employer.verificationDocumentUrl ? (
                    <a
                      href={resolveFileUrl(employer.verificationDocumentUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-sp-blue"
                    >
                      View verification document
                    </a>
                  ) : (
                    <p className="text-sm text-sp-ink-3">No document uploaded yet.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => decide(employer.id, 'rejected')}>
                    Reject
                  </Button>
                  <Button onClick={() => decide(employer.id, 'approved')}>Approve</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
