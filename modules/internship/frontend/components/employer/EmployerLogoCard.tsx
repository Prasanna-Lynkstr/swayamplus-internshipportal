'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { apiFetch } from '@/lib/api';
import { resolveFileUrl } from '@/lib/files';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfirmToast } from '@/components/ui/ConfirmToast';
import type { Employer } from '@/lib/types';

// Self-contained (fetches its own /employers/me), same shape as
// ProfileMediaCard's photo section on the student side.
export function EmployerLogoCard({ token }: { token: string | null }) {
  const [employer, setEmployer] = useState<Employer | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoStatus, setLogoStatus] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<Employer>('/employers/me', { token }).then(setEmployer);
  }, [token]);

  if (!employer) return <p className="text-sm text-sp-ink-3">Loading…</p>;

  const uploadLogo = async (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setLogoPreview(objectUrl);
    setLogoStatus('uploading');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const updated = await apiFetch<Employer>('/employers/me/logo', {
        method: 'POST',
        token,
        body: formData,
      });
      setEmployer(updated);
      setLogoStatus('idle');
    } catch {
      setLogoStatus('error');
    } finally {
      URL.revokeObjectURL(objectUrl);
      setLogoPreview(null);
    }
  };

  const removeLogo = async () => {
    setRemoving(true);
    try {
      const updated = await apiFetch<Employer>('/employers/me/logo', { method: 'DELETE', token });
      setEmployer(updated);
    } finally {
      setRemoving(false);
      setConfirmingRemove(false);
    }
  };

  const logoSrc = logoPreview ?? (employer.logoUrl ? resolveFileUrl(employer.logoUrl) : null);
  const initial = (employer.organizationName ?? 'O').charAt(0).toUpperCase();

  return (
    <Card className="p-6">
      <h2 className="mb-2 text-lg font-bold text-sp-navy">Company logo</h2>
      <p className="mb-4 text-sm text-sp-ink-2">
        Shown on your dashboard and on your public company page.
      </p>
      <div className="flex items-center gap-4">
        {logoSrc ? (
          <Image
            src={logoSrc}
            alt="Company logo"
            width={64}
            height={64}
            unoptimized={logoSrc.startsWith('blob:')}
            className="h-16 w-16 rounded-sp-md object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-sp-md bg-sp-bg-sunken text-xl font-black text-sp-ink-2">
            {initial}
          </div>
        )}
        <input
          ref={logoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadLogo(file);
            e.target.value = '';
          }}
        />
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={logoStatus === 'uploading'}
              onClick={() => logoInputRef.current?.click()}
            >
              {logoStatus === 'uploading' ? 'Uploading…' : employer.logoUrl ? 'Replace logo' : 'Choose logo'}
            </Button>
            {employer.logoUrl && (
              <Button
                type="button"
                variant="ghost"
                className="text-sp-danger hover:bg-sp-danger-soft"
                onClick={() => setConfirmingRemove(true)}
              >
                Remove
              </Button>
            )}
          </div>
          {logoStatus === 'error' && (
            <p className="text-sm font-semibold text-sp-danger">
              Upload failed — use a JPEG, PNG, or WebP under 2MB.
            </p>
          )}
        </div>
      </div>

      {confirmingRemove && (
        <ConfirmToast
          message="Remove your company logo?"
          confirmLabel="Remove"
          danger
          busy={removing}
          onConfirm={removeLogo}
          onCancel={() => setConfirmingRemove(false)}
        />
      )}
    </Card>
  );
}
