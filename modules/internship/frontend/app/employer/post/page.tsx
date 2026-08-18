'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { InternshipForm } from '@/components/employer/InternshipForm';

export default function PostInternshipPage() {
  const { token } = useAuth();
  const router = useRouter();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-extrabold text-sp-navy">Post an internship</h1>
      <InternshipForm
        submitLabel="Create internship (as draft)"
        savingLabel="Creating…"
        fallbackError="Could not create the internship. Please check your details and try again."
        onSubmit={async (body) => {
          await apiFetch('/internships', { method: 'POST', token, body });
          router.push('/employer/dashboard');
        }}
      />
    </div>
  );
}
