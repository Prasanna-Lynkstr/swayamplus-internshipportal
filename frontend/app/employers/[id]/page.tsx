import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { InternshipCard } from '@/components/internships/InternshipCard';
import { CompanyProfileHeader } from '@/components/employers/CompanyProfileHeader';
import { apiFetch, ApiError } from '@/lib/api';
import type { PaginatedInternships, PublicEmployerProfile } from '@/lib/types';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}

async function getEmployer(id: string): Promise<PublicEmployerProfile | null> {
  try {
    return await apiFetch<PublicEmployerProfile>(`/employers/${id}/public`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

const EMPTY_RESULT: PaginatedInternships = { items: [], total: 0, page: 1, pageSize: 12, totalPages: 1 };

async function getInternships(id: string, page?: string): Promise<PaginatedInternships> {
  const query = new URLSearchParams({ employerId: id });
  if (page) query.set('page', page);
  try {
    return await apiFetch<PaginatedInternships>(`/internships?${query.toString()}`);
  } catch {
    return EMPTY_RESULT;
  }
}

export default async function EmployerPublicPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { page } = await searchParams;
  const employer = await getEmployer(id);

  if (!employer) {
    notFound();
  }

  const { items, total, totalPages } = await getInternships(id, page);
  const currentPage = Number(page ?? '1');

  return (
    <div className="flex flex-col gap-6">
      <CompanyProfileHeader employer={employer} />

      <div>
        <h2 className="text-lg font-bold text-sp-navy">
          {total} open internship{total === 1 ? '' : 's'}
        </h2>
      </div>

      {items.length === 0 ? (
        <Card className="p-10 text-center text-sp-ink-3">
          No open internships from this employer right now.
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((internship) => (
            <InternshipCard key={internship.id} internship={internship} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label="Pagination">
          <Link
            href={`/employers/${id}?page=${Math.max(1, currentPage - 1)}`}
            aria-disabled={currentPage === 1}
            className={`flex h-9 items-center rounded-full bg-white px-4 text-sm font-bold text-sp-ink-2 hover:bg-black/5 ${
              currentPage === 1 ? 'pointer-events-none opacity-40' : ''
            }`}
          >
            ← Prev
          </Link>
          <span className="text-sm text-sp-ink-2">
            Page {currentPage} of {totalPages}
          </span>
          <Link
            href={`/employers/${id}?page=${Math.min(totalPages, currentPage + 1)}`}
            aria-disabled={currentPage === totalPages}
            className={`flex h-9 items-center rounded-full bg-white px-4 text-sm font-bold text-sp-ink-2 hover:bg-black/5 ${
              currentPage === totalPages ? 'pointer-events-none opacity-40' : ''
            }`}
          >
            Next →
          </Link>
        </nav>
      )}
    </div>
  );
}
