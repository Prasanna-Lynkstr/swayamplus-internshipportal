'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { resolveFileUrl } from '@/lib/files';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfirmToast } from '@/components/ui/ConfirmToast';
import type { Student } from '@/lib/types';

// Self-contained (fetches its own /students/me), same reasoning as
// ProfileFieldsCard — reused at initial profile completion and later edits.
export function ProfileMediaCard({
  token,
  onResumeChange,
}: {
  token: string | null;
  /** Fired whenever the fetched/uploaded resume state changes — lets a
   * wizard-style caller gate "Continue" on a resume actually being on file
   * (resume is required for profileComplete — see student-profile.util.ts). */
  onResumeChange?: (hasResume: boolean) => void;
}) {
  const [student, setStudent] = useState<Student | null>(null);
  const [resumeStatus, setResumeStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [resumeFileName, setResumeFileName] = useState('');
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoStatus, setPhotoStatus] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [confirmingRemovePhoto, setConfirmingRemovePhoto] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<Student>('/students/me', { token }).then(setStudent);
  }, [token]);

  // Fires on the initial fetch and again after every upload/replace/delete —
  // covers every path that can change resumeUrl without listing them each.
  useEffect(() => {
    if (student) onResumeChange?.(Boolean(student.resumeUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onResumeChange is a caller-provided callback, not reactive state to depend on
  }, [student]);

  if (!student) return <p className="text-sm text-sp-ink-3">Loading…</p>;

  const uploadResume = async (file: File, input: HTMLInputElement) => {
    setResumeStatus('uploading');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const updated = await apiFetch<Student>('/students/me/resume', {
        method: 'POST',
        token,
        body: formData,
      });
      setStudent(updated);
      setResumeStatus('done');
      // Otherwise the native file input keeps showing the just-selected
      // filename, which then sits next to the server's randomized storage
      // filename below — two different names for the same file reads as a
      // mismatch/error rather than a successful upload.
      input.value = '';
    } catch {
      setResumeStatus('error');
    }
  };

  const uploadPhoto = async (file: File) => {
    // Instant local preview while the upload is in flight, per the "show a
    // preview before save completes" requirement — swapped for the real
    // hosted URL once the server responds.
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
    setPhotoStatus('uploading');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const updated = await apiFetch<Student>('/students/me/photo', {
        method: 'POST',
        token,
        body: formData,
      });
      setStudent(updated);
      setPhotoStatus('idle');
    } catch {
      setPhotoStatus('error');
    } finally {
      URL.revokeObjectURL(objectUrl);
      setPhotoPreview(null);
    }
  };

  const removePhoto = async () => {
    setRemovingPhoto(true);
    try {
      const updated = await apiFetch<Student>('/students/me/photo', { method: 'DELETE', token });
      setStudent(updated);
    } finally {
      setRemovingPhoto(false);
      setConfirmingRemovePhoto(false);
    }
  };

  const avatarSrc = photoPreview ?? (student.photoUrl ? resolveFileUrl(student.photoUrl) : null);
  const initial = (student.fullName ?? 'S').charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <h2 className="mb-2 text-lg font-bold text-sp-navy">Profile photo</h2>
        <p className="mb-4 text-sm text-sp-ink-2">Shown on your dashboard and to employers reviewing applicants.</p>
        <div className="flex items-center gap-4">
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, not a build-time asset
            <img
              src={avatarSrc}
              alt="Profile"
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sp-bg-sunken text-xl font-black text-sp-ink-2">
              {initial}
            </div>
          )}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadPhoto(file);
              e.target.value = '';
            }}
          />
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={photoStatus === 'uploading'}
                onClick={() => photoInputRef.current?.click()}
              >
                {photoStatus === 'uploading' ? 'Uploading…' : student.photoUrl ? 'Replace photo' : 'Choose photo'}
              </Button>
              {student.photoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-sp-danger hover:bg-sp-danger-soft"
                  onClick={() => setConfirmingRemovePhoto(true)}
                >
                  Remove
                </Button>
              )}
            </div>
            {photoStatus === 'error' && (
              <p className="text-sm font-semibold text-sp-danger">
                Upload failed — use a JPEG, PNG, or WebP under 2MB.
              </p>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-2 text-lg font-bold text-sp-navy">Resume</h2>
        <p className="mb-4 text-sm text-sp-ink-2">
          Upload a PDF or Word document — employers see this when you apply.
        </p>
        <input
          ref={resumeInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setResumeFileName(file.name);
              uploadResume(file, e.target);
            }
          }}
          className="hidden"
        />
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={resumeStatus === 'uploading'}
            onClick={() => resumeInputRef.current?.click()}
          >
            {resumeStatus === 'uploading' ? 'Uploading…' : 'Choose file'}
          </Button>
          {resumeFileName && <span className="text-sm text-sp-ink-3">{resumeFileName}</span>}
        </div>
        {resumeStatus === 'done' && (
          <p className="mt-2 text-sm font-semibold text-sp-good">Resume uploaded.</p>
        )}
        {resumeStatus === 'error' && (
          <p className="mt-2 text-sm font-semibold text-sp-danger">Upload failed. Try again.</p>
        )}
        {student.resumeUrl && (
          <p className="mt-2 text-sm text-sp-ink-3">
            Resume on file —{' '}
            <a
              href={resolveFileUrl(student.resumeUrl)}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-sp-blue"
            >
              View resume
            </a>
          </p>
        )}
      </Card>

      {confirmingRemovePhoto && (
        <ConfirmToast
          message="Remove your profile photo?"
          confirmLabel="Remove"
          danger
          busy={removingPhoto}
          onConfirm={removePhoto}
          onCancel={() => setConfirmingRemovePhoto(false)}
        />
      )}
    </div>
  );
}
