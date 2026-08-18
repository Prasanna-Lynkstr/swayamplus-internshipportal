'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OtpFlow } from './OtpFlow';
import { LinkButton } from '@/components/ui/Button';
import type { UserRole } from '@/lib/types';

type LoginRole = Extract<UserRole, 'student' | 'employer'>;

// One shared sign-in surface for both roles — OtpFlow itself has no role
// picker (it just takes whatever `role` prop its caller hardcodes), so this
// component owns the toggle and re-mounts OtpFlow on switch via `key` (the
// same "force a clean instance on filter change" idiom already used for
// ApplicantsPanel in the employer dashboard) so a half-entered OTP for one
// role never bleeds into the other.
export function LoginCard({ initialRole }: { initialRole: LoginRole }) {
  const router = useRouter();
  const [role, setRole] = useState<LoginRole>(initialRole);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 rounded-sp-xl border border-black/5 bg-sp-bg-elev p-7 shadow-sm shadow-black/5">
      <div>
        <h1 className="text-xl font-extrabold text-sp-navy">Sign in to SWAYAM Plus</h1>
        <p className="mt-1 text-sm text-sp-ink-3">
          No password needed — verify your email and you&apos;re in, whether you&apos;re new or returning.
        </p>
      </div>

      <div className="inline-flex w-fit rounded-full border border-black/10 bg-sp-bg-sunken p-1">
        {(['student', 'employer'] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            aria-pressed={role === r}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
              role === r ? 'bg-sp-navy text-white' : 'text-sp-ink-2 hover:text-sp-navy'
            }`}
          >
            {r === 'student' ? "I'm a student" : "I'm an employer"}
          </button>
        ))}
      </div>

      <OtpFlow
        key={role}
        role={role}
        onVerified={() => router.push(role === 'employer' ? '/employer/dashboard' : '/student/dashboard')}
      />

      <div className="border-t border-black/5 pt-4 text-center">
        {role === 'employer' ? (
          <>
            <p className="text-sm text-sp-ink-2">First time here?</p>
            <LinkButton href="/internships/employers/eoi" variant="secondary" className="mt-2" withArrow>
              Submit an Expression of Interest
            </LinkButton>
          </>
        ) : (
          <LinkButton href="/internships/browse" variant="secondary" withArrow>
            Browse internships without signing in
          </LinkButton>
        )}
      </div>
    </div>
  );
}
