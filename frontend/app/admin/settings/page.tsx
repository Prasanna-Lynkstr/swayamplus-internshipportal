'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AdminTabs } from '@/components/layout/AdminTabs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { PlatformSettings } from '@/lib/types';

export default function AdminSettingsPage() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setLoadError('');
    apiFetch<PlatformSettings>('/admin/settings', { token })
      .then(setSettings)
      .catch(() => setLoadError('Could not load settings. Please refresh the page.'))
      .finally(() => setLoading(false));
  }, [token]);

  const toggleRegistration = async () => {
    if (!settings) return;
    setActionError('');
    try {
      const updated = await apiFetch<PlatformSettings>('/admin/settings', {
        method: 'PATCH',
        token,
        body: { employerRegistrationOpen: !settings.employerRegistrationOpen },
      });
      setSettings(updated);
    } catch {
      setActionError('Could not update settings. Please try again.');
    }
  };

  const toggleEmailNotifications = async () => {
    if (!settings) return;
    setActionError('');
    try {
      const updated = await apiFetch<PlatformSettings>('/admin/settings', {
        method: 'PATCH',
        token,
        body: { emailNotificationsEnabled: !settings.emailNotificationsEnabled },
      });
      setSettings(updated);
    } catch {
      setActionError('Could not update settings. Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-sp-navy">Platform administration</h1>
        <p className="mt-1 text-sp-ink-2">Platform-wide settings.</p>
      </div>

      <AdminTabs />

      {loading ? (
        <p className="text-sp-ink-3">Loading…</p>
      ) : loadError ? (
        <p className="text-sm font-semibold text-sp-danger">{loadError}</p>
      ) : (
        <>
          {actionError && <p className="text-sm font-semibold text-sp-danger">{actionError}</p>}

          <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <h2 className="text-lg font-bold text-sp-navy">Employer registration</h2>
              <p className="text-sm text-sp-ink-2">
                {settings?.employerRegistrationOpen
                  ? 'New employers can currently self-register.'
                  : 'Employer registration is closed to new sign-ups.'}
              </p>
            </div>
            <Button
              variant={settings?.employerRegistrationOpen ? 'secondary' : 'primary'}
              onClick={toggleRegistration}
            >
              {settings?.employerRegistrationOpen ? 'Pause employer sign-ups' : 'Resume employer sign-ups'}
            </Button>
          </Card>

          <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <h2 className="text-lg font-bold text-sp-navy">Email notifications</h2>
              <p className="text-sm text-sp-ink-2">
                {settings?.emailNotificationsEnabled
                  ? 'Students and employers receive real email updates (application status, verification decisions).'
                  : 'Email sending is paused — notifications are only logged server-side, nothing is delivered.'}
              </p>
            </div>
            <Button
              variant={settings?.emailNotificationsEnabled ? 'secondary' : 'primary'}
              onClick={toggleEmailNotifications}
            >
              {settings?.emailNotificationsEnabled ? 'Disable' : 'Enable'}
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}
