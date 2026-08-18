import { CandidateFilterSidebar } from '@/components/employer/CandidateFilterSidebar';
import { CandidateActiveFilterChips } from '@/components/employer/CandidateActiveFilterChips';
import { CandidateSearchBar } from '@/components/employer/CandidateSearchBar';
import { CandidateSortSelect } from '@/components/employer/CandidateSortSelect';
import { CandidateListRow } from '@/components/employer/CandidateListRow';
import { Pagination } from '@/components/internships/Pagination';
import { buildCandidatesHref } from '@/lib/candidateFilters';
import { apiFetch, ApiError } from '@/lib/api';
import { getServerAuthToken } from '@/lib/serverAuth';
import type { PaginatedCandidates } from '@/lib/types';
import type { TaxonomyOption } from '@/lib/useTaxonomy';

interface Props {
  searchParams: Promise<{
    q?: string;
    location?: string;
    category?: string;
    mode?: string;
    employmentType?: string;
    activeOnly?: string;
    sort?: string;
    page?: string;
  }>;
}

const EMPTY_RESULT: PaginatedCandidates = { items: [], total: 0, page: 1, pageSize: 12, totalPages: 1 };

async function getCandidates(
  params: Awaited<Props['searchParams']>,
  token: string | null,
): Promise<PaginatedCandidates | 'forbidden'> {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.location) query.set('location', params.location);
  if (params.category) query.set('category', params.category);
  if (params.mode) query.set('mode', params.mode);
  if (params.employmentType) query.set('employmentType', params.employmentType);
  if (params.activeOnly) query.set('activeOnly', params.activeOnly);
  if (params.sort) query.set('sort', params.sort);
  if (params.page) query.set('page', params.page);
  const qs = query.toString();
  try {
    return await apiFetch<PaginatedCandidates>(`/candidates${qs ? `?${qs}` : ''}`, { token });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) return 'forbidden';
    return EMPTY_RESULT;
  }
}

async function getTaxonomy(listKey: string): Promise<TaxonomyOption[]> {
  try {
    return await apiFetch<TaxonomyOption[]>(`/taxonomies/${listKey}`);
  } catch {
    return [];
  }
}

export default async function CandidatesPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = await getServerAuthToken();
  const [result, categories, modes, employmentTypes] = await Promise.all([
    getCandidates(params, token),
    getTaxonomy('internship_category'),
    getTaxonomy('work_mode'),
    getTaxonomy('employment_type'),
  ]);

  if (result === 'forbidden') {
    return (
      <div className="mx-auto max-w-md rounded-sp-lg border border-black/5 bg-sp-bg-elev p-8 text-center shadow-sm shadow-black/5">
        <p className="font-bold text-sp-navy">Verified employers only</p>
        <p className="mt-2 text-sm text-sp-ink-3">
          Once your organization is verified by admin, you&apos;ll be able to search registered candidates here.
        </p>
      </div>
    );
  }

  const { items, total, page, totalPages } = result;
  const activeFilterCount = [
    params.category,
    params.mode,
    params.employmentType,
    params.location,
    params.activeOnly,
  ].filter(Boolean).length;
  const pageStart = total === 0 ? 0 : (page - 1) * result.pageSize + 1;
  const pageEnd = Math.min(page * result.pageSize, total);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-sp-orange-ink">
          Find candidates
        </span>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-sp-navy sm:text-4xl">
          Search registered candidates
        </h1>
        <p className="mt-1 text-sm text-sp-ink-3">
          Browse students who&apos;ve made their profile discoverable — filter by what they&apos;re interested in,
          not just who&apos;s applied to your listings.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[272px_1fr]">
        <CandidateFilterSidebar categories={categories} modes={modes} employmentTypes={employmentTypes} currentParams={params} />

        <div className="flex flex-col gap-4">
          <CandidateSearchBar currentParams={params} />
          <CandidateActiveFilterChips currentParams={params} modes={modes} employmentTypes={employmentTypes} />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-sp-ink-2">
              {total === 0 ? (
                activeFilterCount > 0 || params.q ? 'No candidates match your filters' : 'No candidates found'
              ) : (
                <>
                  Showing {pageStart}&ndash;{pageEnd} of {total.toLocaleString('en-IN')} candidates
                </>
              )}
            </p>
            <CandidateSortSelect currentParams={params} />
          </div>

          {items.length === 0 ? (
            <div className="rounded-sp-lg border border-dashed border-black/10 bg-sp-bg-elev p-12 text-center">
              <span className="text-3xl">🔍</span>
              <p className="mt-3 font-bold text-sp-navy">No candidates match your filters.</p>
              <p className="mt-1 text-sm text-sp-ink-3">Try broadening your search or filters.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {items.map((candidate) => (
                  <CandidateListRow key={candidate.id} candidate={candidate} token={token} />
                ))}
              </div>
              <div className="mt-2">
                <Pagination page={page} totalPages={totalPages} currentParams={params} buildHref={buildCandidatesHref} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
