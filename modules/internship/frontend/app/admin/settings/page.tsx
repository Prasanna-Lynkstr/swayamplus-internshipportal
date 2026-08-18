'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AdminTabs } from '@/components/layout/AdminTabs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
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

  const toggleAutoApprove = async () => {
    if (!settings) return;
    setActionError('');
    try {
      const updated = await apiFetch<PlatformSettings>('/admin/settings', {
        method: 'PATCH',
        token,
        body: { autoApproveEmployers: !settings.autoApproveEmployers },
      });
      setSettings(updated);
    } catch {
      setActionError('Could not update settings. Please try again.');
    }
  };

  const toggleResumeParsing = async () => {
    if (!settings) return;
    setActionError('');
    try {
      const updated = await apiFetch<PlatformSettings>('/admin/settings', {
        method: 'PATCH',
        token,
        body: { resumeParsingEnabled: !settings.resumeParsingEnabled },
      });
      setSettings(updated);
    } catch {
      setActionError('Could not update settings. Please try again.');
    }
  };

  const setResumeParsingProvider = async (provider: 'anthropic' | 'openai') => {
    if (!settings) return;
    setActionError('');
    try {
      const updated = await apiFetch<PlatformSettings>('/admin/settings', {
        method: 'PATCH',
        token,
        body: { resumeParsingProvider: provider },
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
              <h2 className="text-lg font-bold text-sp-navy">Employer EOI submissions</h2>
              <p className="text-sm text-sp-ink-2">
                {settings?.employerRegistrationOpen
                  ? 'New employers can currently submit an Expression of Interest.'
                  : 'EOI submissions are paused — the form shows a closed message to visitors.'}
              </p>
            </div>
            <Button
              variant={settings?.employerRegistrationOpen ? 'secondary' : 'primary'}
              onClick={toggleRegistration}
            >
              {settings?.employerRegistrationOpen ? 'Pause EOI submissions' : 'Resume EOI submissions'}
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

          <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <h2 className="text-lg font-bold text-sp-navy">Employer auto-approval</h2>
              <p className="text-sm text-sp-ink-2">
                {settings?.autoApproveEmployers
                  ? 'New employer EOI submissions are approved automatically — no admin review before they can post.'
                  : 'New employer EOI submissions wait in the EOI review queue for an admin decision.'}
              </p>
            </div>
            <Button
              variant={settings?.autoApproveEmployers ? 'secondary' : 'primary'}
              onClick={toggleAutoApprove}
            >
              {settings?.autoApproveEmployers ? 'Disable' : 'Enable'}
            </Button>
          </Card>

          <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <h2 className="text-lg font-bold text-sp-navy">Resume field autofill (AI)</h2>
              <p className="text-sm text-sp-ink-2">
                {settings?.resumeParsingEnabled
                  ? "On — a student's uploaded resume is sent to the selected AI provider to suggest name/phone/college/course/graduation year/skills for review."
                  : 'Off — resumes are stored as uploaded, but no field extraction runs at all. Students fill in the registration form by hand.'}
              </p>
              {settings?.resumeParsingEnabled && (
                <div className="mt-3 flex items-center gap-2">
                  <label className="text-sm font-semibold text-sp-ink-2">Provider:</label>
                  <div className="w-40">
                    <Select
                      value={settings.resumeParsingProvider}
                      onChange={(e) => setResumeParsingProvider(e.target.value as 'anthropic' | 'openai')}
                    >
                      <option value="anthropic">Anthropic (Claude)</option>
                      <option value="openai">OpenAI</option>
                    </Select>
                  </div>
                </div>
              )}
            </div>
            <Button
              variant={settings?.resumeParsingEnabled ? 'secondary' : 'primary'}
              onClick={toggleResumeParsing}
            >
              {settings?.resumeParsingEnabled ? 'Disable' : 'Enable'}
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}
