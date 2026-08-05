'use client';

import { useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import type { AuthUser, UserRole } from '@/lib/types';

interface Props {
  role: Extract<UserRole, 'student' | 'employer'>;
  onVerified: () => void;
}

export function OtpFlow({ role, onVerified }: Props) {
  const { login } = useAuth();
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<{ message: string; otp?: string }>('/auth/otp/request', {
        method: 'POST',
        body: { identifier, role },
      });
      setDevOtp(res.otp ?? null);
      setStep('verify');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<{ accessToken: string; user: AuthUser }>('/auth/otp/verify', {
        method: 'POST',
        body: { identifier, otp, role },
      });
      login(res.accessToken, res.user);
      onVerified();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'request') {
    return (
      <form onSubmit={requestOtp} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="identifier">Email address</Label>
          <Input
            id="identifier"
            type="email"
            required
            placeholder="you@example.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </div>
        {error && <p className="text-sm font-semibold text-sp-danger">{error}</p>}
        <Button type="submit" disabled={loading} withArrow>
          {loading ? 'Sending…' : 'Send OTP'}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={verifyOtp} className="flex flex-col gap-4">
      <p className="text-sm text-sp-ink-2">
        We&apos;ve sent a 6-digit code to <strong>{identifier}</strong>.
      </p>
      {devOtp && (
        <p className="rounded-sp-md bg-sp-orange-soft px-3 py-2 text-sm font-bold text-sp-orange-ink">
          Dev mode — your OTP is <span className="font-mono">{devOtp}</span> (no email provider is
          wired up yet).
        </p>
      )}
      <div>
        <Label htmlFor="otp">Enter OTP</Label>
        <Input
          id="otp"
          inputMode="numeric"
          maxLength={6}
          required
          placeholder="123456"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
        />
      </div>
      {error && <p className="text-sm font-semibold text-sp-danger">{error}</p>}
      <Button type="submit" disabled={loading} withArrow>
        {loading ? 'Verifying…' : 'Verify & continue'}
      </Button>
      <button
        type="button"
        onClick={() => setStep('request')}
        className="text-sm font-semibold text-sp-blue"
      >
        Use a different email
      </button>
    </form>
  );
}
