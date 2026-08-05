import { Suspense } from 'react';
import { FilterBar } from '@/components/internships/FilterBar';
import { InternshipCard } from '@/components/internships/InternshipCard';
import { RequestInternshipForm } from '@/components/internships/RequestInternshipForm';
import { apiFetch } from '@/lib/api';
import type { Internship } from '@/lib/types';

interface Props {
  searchParams: Promise<{ q?: string; location?: string; domain?: string; mode?: string }>;
}

async function getInternships(params: Awaited<Props['searchParams']>): Promise<Internship[]> {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.location) query.set('location', params.location);
  if (params.domain) query.set('domain', params.domain);
  if (params.mode) query.set('mode', params.mode);
  const qs = query.toString();
  try {
    return await apiFetch<Internship[]>(`/internships${qs ? `?${qs}` : ''}`);
  } catch {
    return [];
  }
}

export default async function InternshipsPage({ searchParams }: Props) {
  const params = await searchParams;
  const internships = await getInternships(params);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-extrabold text-sp-navy">Browse internships</h1>
        <p className="mt-1 text-sp-ink-2">
          {internships.length} internship{internships.length === 1 ? '' : 's'} currently open.
        </p>
      </div>

      <Suspense>
        <FilterBar />
      </Suspense>

      {internships.length === 0 ? (
        <div className="flex flex-col gap-6">
          <div className="rounded-sp-xl border border-dashed border-black/10 bg-white p-12 text-center text-sp-ink-3">
            No internships match your filters right now. Try broadening your search.
          </div>
          <RequestInternshipForm variant="empty-state" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {internships.map((internship) => (
              <InternshipCard key={internship.id} internship={internship} />
            ))}
          </div>
          <RequestInternshipForm variant="inline" />
        </>
      )}
    </div>
  );
}
