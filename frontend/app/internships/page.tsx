import { Suspense } from 'react';
import { FilterBar } from '@/components/internships/FilterBar';
import { InternshipCard } from '@/components/internships/InternshipCard';
import { CategoryPills } from '@/components/internships/CategoryPills';
import { Pagination } from '@/components/internships/Pagination';
import { RequestInternshipForm } from '@/components/internships/RequestInternshipForm';
import { apiFetch } from '@/lib/api';
import type { CategoryCount, PaginatedInternships } from '@/lib/types';

interface Props {
  searchParams: Promise<{
    q?: string;
    location?: string;
    category?: string;
    mode?: string;
    employmentType?: string;
    sort?: string;
    page?: string;
  }>;
}

const EMPTY_RESULT: PaginatedInternships = { items: [], total: 0, page: 1, pageSize: 12, totalPages: 1 };

async function getInternships(params: Awaited<Props['searchParams']>): Promise<PaginatedInternships> {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.location) query.set('location', params.location);
  if (params.category) query.set('category', params.category);
  if (params.mode) query.set('mode', params.mode);
  if (params.employmentType) query.set('employmentType', params.employmentType);
  if (params.sort) query.set('sort', params.sort);
  if (params.page) query.set('page', params.page);
  const qs = query.toString();
  try {
    return await apiFetch<PaginatedInternships>(`/internships${qs ? `?${qs}` : ''}`);
  } catch {
    return EMPTY_RESULT;
  }
}

async function getCategories(): Promise<CategoryCount[]> {
  try {
    return await apiFetch<CategoryCount[]>('/internships/categories');
  } catch {
    return [];
  }
}

export default async function InternshipsPage({ searchParams }: Props) {
  const params = await searchParams;
  const [result, categories] = await Promise.all([getInternships(params), getCategories()]);
  const { items, total, page, totalPages } = result;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold text-sp-navy">
          {total.toLocaleString('en-IN')}+ Internships on SWAYAM Plus
        </h1>
        <p className="mt-1 text-sp-ink-2">Paid, remote &amp; campus internships for students and freshers.</p>
      </div>

      <CategoryPills categories={categories} activeCategory={params.category} currentParams={params} />

      <Suspense>
        <FilterBar />
      </Suspense>

      <div className="flex flex-col gap-4">
        {items.length === 0 ? (
          <div className="flex flex-col gap-6">
            <div className="rounded-sp-xl border border-dashed border-black/10 bg-white p-12 text-center text-sp-ink-3">
              No internships match your filters right now. Try broadening your search.
            </div>
            <RequestInternshipForm variant="empty-state" />
          </div>
        ) : (
          <>
            {items.map((internship) => (
              <InternshipCard key={internship.id} internship={internship} />
            ))}
            <div className="mt-2">
              <Pagination page={page} totalPages={totalPages} currentParams={params} />
            </div>
            <RequestInternshipForm variant="inline" />
          </>
        )}
      </div>
    </div>
  );
}
