'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { OtpFlow } from '@/components/auth/OtpFlow';
import { RegistrationProgress } from '@/components/auth/RegistrationProgress';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProfileFieldsCard } from '@/components/student/ProfileFieldsCard';
import { ProfileMediaCard } from '@/components/student/ProfileMediaCard';
import { PreferencesCard } from '@/components/student/PreferencesCard';
import type { Student } from '@/lib/types';

const WIZARD_LABELS = ['Verify', 'Basic details', 'Photo & resume', 'Preferences'];

export default function StudentRegisterPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [verified, setVerified] = useState(false);
  // 0 = Basic details, 1 = Photo & resume, 2 = Preferences.
  const [subStep, setSubStep] = useState(0);
  // Gates "Continue" on the Photo & resume step — a resume is required for
  // profileComplete (see student-profile.util.ts on the backend), unlike the
  // photo, which is why only this one blocks moving on.
  const [hasResume, setHasResume] = useState(false);

  const isStudent = user?.role === 'student';
  // undefined = still checking, true = complete (redirecting to dashboard),
  // false = incomplete (show the wizard below). Only the completeness flag
  // is needed here now — the actual field values live inside each step's own
  // card, which fetches its own copy.
  const [profileComplete, setProfileComplete] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (!isStudent || !token) return;
    apiFetch<Student>('/students/me', { token })
      .then((s) => {
        if (s.profileComplete) {
          // Already set up — landing on the profile wizard again on every
          // login is pointless busywork. Send them straight to the
          // dashboard instead, whether this was a fresh OTP verify or a
          // returning, already-authenticated visit to this page. Editing
          // after completion happens from /student/dashboard instead.
          setProfileComplete(true);
          router.replace('/student/dashboard');
          return;
        }
        setProfileComplete(false);
      })
      .catch(() => setProfileComplete(false));
  }, [isStudent, token, router]);

  if (!isStudent && !verified) {
    return (
      <div className="mx-auto max-w-md">
        <RegistrationProgress labels={WIZARD_LABELS} current={1} />
        <div className="text-center">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-sp-orange-ink">
            Student registration
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-sp-navy">
            Verify your email
          </h1>
          <p className="mt-3 text-sp-ink-2">We&apos;ll send a 6-digit code to your email.</p>
        </div>
        <Card className="mt-8 p-7 shadow-sm shadow-black/5">
          <OtpFlow role="student" onVerified={() => setVerified(true)} />
        </Card>
      </div>
    );
  }

  if (profileComplete === undefined || profileComplete === true) {
    return <p className="text-center text-sp-ink-3">Loading…</p>;
  }

  const goToDashboard = () => router.replace('/student/dashboard');

  return (
    <div className="mx-auto max-w-2xl">
      <RegistrationProgress labels={WIZARD_LABELS} current={subStep + 2} />
      <div className="mb-10 text-center">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-sp-orange-ink">
          Student registration
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-sp-navy">
          {subStep === 0 && 'Tell us about yourself'}
          {subStep === 1 && 'Add your photo & resume'}
          {subStep === 2 && "What are you looking for?"}
        </h1>
        <p className="mt-3 text-sp-ink-2">
          {subStep === 0 && 'This helps employers understand your background when you apply.'}
          {subStep === 1 && 'A photo and resume make your applications stand out.'}
          {subStep === 2 && "Optional, but helps us surface internships that actually match what you want."}
        </p>
      </div>

      {subStep === 0 && (
        <Card className="p-6 shadow-sm shadow-black/5">
          <ProfileFieldsCard token={token} onSaved={() => setSubStep(1)} />
        </Card>
      )}

      {subStep === 1 && (
        <div className="flex flex-col gap-5">
          <ProfileMediaCard token={token} onResumeChange={setHasResume} />
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setSubStep(0)}>
              ← Back
            </Button>
            <div className="text-right">
              {!hasResume && (
                <p className="mb-1.5 text-xs font-semibold text-sp-ink-3">
                  Upload a resume to continue — employers need it to review your application.
                </p>
              )}
              <Button onClick={() => setSubStep(2)} disabled={!hasResume} withArrow>
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      {subStep === 2 && (
        <div className="flex flex-col gap-4">
          <Card pastel="lavender" className="p-6">
            <PreferencesCard token={token} onSaved={goToDashboard} />
          </Card>
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setSubStep(1)}>
              ← Back
            </Button>
            <Button variant="secondary" onClick={goToDashboard}>
              Skip for now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
