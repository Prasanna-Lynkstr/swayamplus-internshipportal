'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import type { AuthUser } from '@/lib/types';

export default function AdminLoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<{ accessToken: string; user: AuthUser }>('/auth/admin/login', {
        method: 'POST',
        body: { email, password },
      });
      login(res.accessToken, res.user);
      router.push('/admin/employers');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-2 text-center text-2xl font-extrabold text-sp-navy">Admin sign-in</h1>
      <p className="mb-6 text-center text-sm text-sp-ink-2">
        Admin accounts are provisioned separately from student and employer OTP sign-in.
      </p>
      <Card className="p-6">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm font-semibold text-sp-danger">{error}</p>}
          <Button type="submit" disabled={loading} withArrow>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
