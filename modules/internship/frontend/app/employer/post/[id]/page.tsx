'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import {
  InternshipForm,
  internshipToFormValues,
  type InternshipFormValues,
} from '@/components/employer/InternshipForm';
import type { Internship } from '@/lib/types';

export default function EditInternshipPage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [initial, setInitial] = useState<InternshipFormValues | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    apiFetch<Internship>(`/internships/${params.id}`, { token })
      .then((internship) => setInitial(internshipToFormValues(internship)))
      .catch(() => setError('Could not load this internship. Please try again.'));
  }, [token, params.id]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-extrabold text-sp-navy">Edit internship</h1>
      {error ? (
        <p className="text-sm font-semibold text-sp-danger">{error}</p>
      ) : !initial ? (
        <p className="text-sp-ink-3">Loading…</p>
      ) : (
        <InternshipForm
          initial={initial}
          submitLabel="Save changes"
          savingLabel="Saving…"
          fallbackError="Could not save your changes. Please check your details and try again."
          onSubmit={async (body) => {
            await apiFetch(`/internships/${params.id}`, { method: 'PATCH', token, body });
            router.push('/employer/dashboard');
          }}
        />
      )}
    </div>
  );
}
