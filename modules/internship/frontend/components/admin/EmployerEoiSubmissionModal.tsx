'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { resolveFileUrl } from '@/lib/files';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, List } from '@/components/ui/DetailField';
import { ContactRow, IconMail, IconPhone, LinkChip } from '@/components/ui/ContactLinks';
import { Input } from '@/components/ui/Input';
import { EMPLOYER_VERIFICATION_STATUS_TONE } from '@/lib/status-labels';
import type { EmployerEoi } from '@/lib/types';

interface Props {
  eoi: EmployerEoi | null;
  onClose: () => void;
  onApprove: (eoi: EmployerEoi) => void;
  onReject: (eoi: EmployerEoi) => void;
  /** Fired after the email is successfully edited — lets the parent list refresh this row. */
  onUpdated: (eoi: EmployerEoi) => void;
}

// The pre-account counterpart to EmployerEoiModal — same two-column layout
// and shared ContactRow/LinkChip/Field/List primitives, but for an
// EmployerEoi row instead of an Employer, and with the one interaction the
// existing modal never needed: resolving an email collision before Approve
// can even be attempted (see EmployerEoiService.decide's server-side check).
export function EmployerEoiSubmissionModal({ eoi, onClose, onApprove, onReject, onUpdated }: Props) {
  const { token } = useAuth();
  const [email, setEmail] = useState(eoi?.email ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setEmail(eoi?.email ?? '');
    setError('');
  }, [eoi]);

  useEffect(() => {
    if (!eoi) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [eoi, onClose]);

  if (!eoi || typeof document === 'undefined') return null;

  const saveEmail = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await apiFetch<EmployerEoi>(`/admin/employer-eoi/${eoi.id}/email`, {
        method: 'PATCH',
        token,
        body: { email },
      });
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update the email.');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Expression of Interest details"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-sp-xl bg-sp-bg-elev shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-sp-ink-3 shadow-sm hover:bg-white hover:text-sp-navy"
        >
          &times;
        </button>

        <div className="grid flex-1 grid-cols-1 items-start overflow-y-auto lg:grid-cols-[290px_1fr] lg:divide-x lg:divide-black/5">
          {/* Identity rail */}
          <div className="flex flex-col gap-5 border-b border-black/5 bg-sp-bg-sunken/60 p-5 lg:border-b-0">
            <div className="flex flex-col items-center gap-2 rounded-sp-lg bg-sp-pastel-peach/60 p-5 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-xl font-black text-sp-ink-2">
                {eoi.organizationName.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-base font-extrabold text-sp-navy">{eoi.organizationName}</h2>
              <p className="text-xs text-sp-ink-3">{eoi.hqCity}</p>
              <Badge tone={EMPLOYER_VERIFICATION_STATUS_TONE[eoi.status]}>{eoi.status}</Badge>
              <p className="text-[11px] text-sp-ink-3">
                Submitted {new Date(eoi.createdAt).toLocaleDateString('en-IN')}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">Contact</p>
              <p className="text-sm font-semibold text-sp-navy">{eoi.contactPersonName}</p>
              <ContactRow icon={<IconPhone />} value={eoi.contactPersonPhone} />
              <ContactRow icon={<IconMail />} value={eoi.email} />
            </div>

            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-sp-ink-3">Links</p>
              <div className="flex flex-wrap gap-1.5">
                <LinkChip
                  label="Certificate of Incorporation"
                  href={resolveFileUrl(eoi.certificateOfIncorporationUrl)}
                  accent
                />
                <LinkChip label="Website" href={eoi.website} />
                <LinkChip label="LinkedIn" href={eoi.linkedinBusinessPage} />
              </div>
            </div>
          </div>

          {/* Decision-relevant content */}
          <div className="flex flex-col gap-5 p-5">
            <div className="rounded-sp-md bg-sp-pastel-lavender p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-sp-ink-3">Reason for EOI</p>
              <p className="text-sm text-sp-ink-2">{eoi.reasonForEoi}</p>
            </div>

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="CIN" value={eoi.cin} />
              <Field label="Headcount" value={String(eoi.headcount)} />
              <List label="Internship types expected" items={eoi.internshipTypesExpected} />
              <List label="Industry tags" items={eoi.industryTags} />
            </dl>

            {eoi.status === 'pending' && (
              <div
                className={`rounded-sp-md p-4 ${eoi.emailInUse ? 'bg-sp-danger-soft' : 'bg-sp-bg-sunken'}`}
              >
                {eoi.emailInUse ? (
                  <>
                    <p className="text-sm font-bold text-sp-danger">
                      An employer account already exists for this email.
                    </p>
                    <p className="mt-1 text-sm text-sp-ink-2">
                      Edit it below — a typo, or ask the submitter for a different email — before
                      this can be approved.
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-semibold text-sp-ink-2">
                    This email is clear — approving will create a new employer account.
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={saving || email === eoi.email}
                    onClick={saveEmail}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </div>
                {error && <p className="mt-2 text-sm font-semibold text-sp-danger">{error}</p>}
              </div>
            )}
          </div>
        </div>

        {eoi.status === 'pending' && (
          <div className="flex shrink-0 justify-end gap-2 border-t border-black/5 px-6 py-4">
            <Button variant="secondary" onClick={() => onReject(eoi)}>
              Reject
            </Button>
            <Button disabled={eoi.emailInUse} onClick={() => onApprove(eoi)}>
              Approve
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
