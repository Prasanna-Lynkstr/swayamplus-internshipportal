'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { OtpFlow } from '@/components/auth/OtpFlow';
import { RegistrationProgress } from '@/components/auth/RegistrationProgress';
import { Card } from '@/components/ui/Card';
import { EmployerProfileForm } from '@/components/employer/EmployerProfileForm';
import type { Employer } from '@/lib/types';

const WIZARD_LABELS = ['Verify', 'Organization', 'Documents', 'Review'];

export default function EmployerRegisterPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null);
  const [verified, setVerified] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  // undefined = still checking, true = complete (redirecting to dashboard),
  // false = incomplete (show the form below).
  const [profileComplete, setProfileComplete] = useState<boolean | undefined>(undefined);

  const isEmployer = user?.role === 'employer';

  useEffect(() => {
    apiFetch<{ open: boolean }>('/employers/registration-status')
      .then((res) => setRegistrationOpen(res.open))
      .catch(() => setRegistrationOpen(true));
  }, []);

  useEffect(() => {
    if (!isEmployer || !token) return;
    apiFetch<Employer>('/employers/me', { token })
      .then((e) => {
        if (e.profileComplete) {
          // Already set up — landing on the EOI form again on every login is
          // pointless busywork. Send them straight to the dashboard instead,
          // whether this was a fresh OTP verify or a returning visit. Editing
          // after submission happens from /employer/profile instead.
          setProfileComplete(true);
          router.replace('/employer/dashboard');
          return;
        }
        setProfileComplete(false);
      })
      .catch(() => setProfileComplete(false));
  }, [isEmployer, token, router]);

  if (registrationOpen === null) {
    return <p className="text-center text-sp-ink-3">Loading…</p>;
  }

  if (!registrationOpen && !isEmployer) {
    return (
      <div className="mx-auto max-w-md text-center">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-sp-orange-ink">
          Employer registration
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-sp-navy">
          Registrations are paused
        </h1>
        <p className="mt-3 text-sp-ink-2">
          Employer registration on SWAYAM Plus is temporarily closed while we onboard our current
          partners. Please check back soon.
        </p>
      </div>
    );
  }

  if (!isEmployer && !verified) {
    return (
      <div className="mx-auto max-w-md">
        <RegistrationProgress labels={WIZARD_LABELS} current={1} />
        <div className="text-center">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-sp-orange-ink">
            Employer registration
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-sp-navy">
            Verify your work email
          </h1>
          <p className="mt-3 text-sp-ink-2">We&apos;ll send a 6-digit code to your email.</p>
        </div>
        <Card className="mt-8 p-7 shadow-sm shadow-black/5">
          <OtpFlow role="employer" onVerified={() => setVerified(true)} />
        </Card>
      </div>
    );
  }

  if (profileComplete === undefined || profileComplete === true) {
    return <p className="text-center text-sp-ink-3">Loading…</p>;
  }

  const STEP_COPY = [
    {
      title: 'Tell us about your organization',
      body: 'Basic details our admin team reviews first.',
    },
    {
      title: 'Verification & links',
      body: 'Your Certificate of Incorporation is what lets us verify you’re a real organization.',
    },
    {
      title: 'Review & confirm',
      body: 'One last look before you submit.',
    },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <RegistrationProgress labels={WIZARD_LABELS} current={wizardStep + 2} />
      <div className="mb-8 text-center">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-sp-orange-ink">
          Employer registration
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-sp-navy">
          {STEP_COPY[wizardStep].title}
        </h1>
        <p className="mt-3 text-sp-ink-2">{STEP_COPY[wizardStep].body}</p>
      </div>
      <Card className="p-6 shadow-sm shadow-black/5">
        <EmployerProfileForm token={token} mode="register" onStepChange={setWizardStep} />
      </Card>
    </div>
  );
}
