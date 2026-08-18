import { Suspense } from 'react';
import { FilterSidebar } from '@/components/internships/FilterSidebar';
import { MobileFilterToggle } from '@/components/internships/MobileFilterToggle';
import { SearchBar } from '@/components/internships/SearchBar';
import { FilterMemory } from '@/components/internships/FilterMemory';
import { SortSelect } from '@/components/internships/SortSelect';
import { ActiveFilterChips } from '@/components/internships/ActiveFilterChips';
import { InternshipListRow } from '@/components/internships/InternshipListRow';
import { Pagination } from '@/components/internships/Pagination';
import { RequestInternshipForm } from '@/components/internships/RequestInternshipForm';
import { SaveSearchButton } from '@/components/internships/SaveSearchButton';
import { LinkButton } from '@/components/ui/Button';
import { apiFetch } from '@/lib/api';
import { getServerAuthToken } from '@/lib/serverAuth';
import type { CategoryCount, PaginatedInternships } from '@/lib/types';
import type { TaxonomyOption } from '@/lib/useTaxonomy';

interface Props {
  searchParams: Promise<{
    q?: string;
    location?: string;
    category?: string;
    mode?: string;
    employmentType?: string;
    educationLevel?: string;
    stream?: string;
    experienceRequired?: string;
    paid?: string;
    stipendMin?: string;
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
  if (params.educationLevel) query.set('educationLevel', params.educationLevel);
  if (params.stream) query.set('stream', params.stream);
  if (params.experienceRequired) query.set('experienceRequired', params.experienceRequired);
  if (params.paid) query.set('paid', params.paid);
  if (params.stipendMin) query.set('stipendMin', params.stipendMin);
  if (params.sort) query.set('sort', params.sort);
  if (params.page) query.set('page', params.page);
  const qs = query.toString();
  // Forwarding the token (when present) is what lets the backend default to
  // relevance ranking for a logged-in student with skills set — an
  // anonymous request behaves exactly as before.
  const token = await getServerAuthToken();
  try {
    return await apiFetch<PaginatedInternships>(`/internships${qs ? `?${qs}` : ''}`, { token });
  } catch {
    return EMPTY_RESULT;
  }
}

// Used only when the actual filtered search comes back empty — early on,
// with few internships posted, a specific-enough search (a category + city +
// paid-only combo, say) can easily match nothing even though other
// internships exist. Rather than a dead end, this fetches a broader set (by
// category if one was picked, else the newest internships overall) so there
// is always *something* to look at, with the request-an-internship form
// alongside it for the genuine case where nothing close exists yet.
async function getFallbackInternships(category?: string): Promise<PaginatedInternships> {
  const query = new URLSearchParams({ pageSize: '6', sort: 'newest' });
  if (category) query.set('category', category);
  try {
    return await apiFetch<PaginatedInternships>(`/internships?${query.toString()}`);
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

async function getTaxonomy(listKey: string): Promise<TaxonomyOption[]> {
  try {
    return await apiFetch<TaxonomyOption[]>(`/taxonomies/${listKey}`);
  } catch {
    return [];
  }
}

export default async function InternshipsPage({ searchParams }: Props) {
  const params = await searchParams;
  const [result, categories, modes, employmentTypes] = await Promise.all([
    getInternships(params),
    getCategories(),
    getTaxonomy('work_mode'),
    getTaxonomy('employment_type'),
  ]);
  const { items, total, page, totalPages } = result;

  const activeFilterCount = [
    params.category,
    params.mode,
    params.employmentType,
    params.educationLevel,
    params.stream,
    params.experienceRequired,
    params.location,
    params.paid,
    params.stipendMin,
  ].filter(Boolean).length;

  const pageStart = total === 0 ? 0 : (page - 1) * result.pageSize + 1;
  const pageEnd = Math.min(page * result.pageSize, total);

  // Only worth chasing a broader result set when the search was actually
  // narrowed — if nothing was filtered/searched and it's still empty, the
  // whole catalog is empty and a second identical query wouldn't help.
  const hasNarrowing = activeFilterCount > 0 || Boolean(params.q);
  let fallback: PaginatedInternships | null = null;
  let fallbackIsSameCategory = false;
  if (items.length === 0 && hasNarrowing) {
    if (params.category) {
      const byCategory = await getFallbackInternships(params.category);
      if (byCategory.items.length > 0) {
        fallback = byCategory;
        fallbackIsSameCategory = true;
      }
    }
    if (!fallback) {
      const anyCategory = await getFallbackInternships();
      if (anyCategory.items.length > 0) fallback = anyCategory;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={null}>
        <FilterMemory />
      </Suspense>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-sp-orange-ink">
            Browse
          </span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-sp-navy sm:text-4xl">
            Find your internship
          </h1>
        </div>
        <LinkButton href="/internships/bookmarked" variant="secondary">
          ★ Bookmarked
        </LinkButton>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[272px_1fr]">
        <MobileFilterToggle activeCount={activeFilterCount}>
          <FilterSidebar
            categories={categories}
            modes={modes}
            employmentTypes={employmentTypes}
            currentParams={params}
          />
        </MobileFilterToggle>

        <div className="flex flex-col gap-4">
          <SearchBar currentParams={params} />
          <ActiveFilterChips currentParams={params} modes={modes} employmentTypes={employmentTypes} />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-sp-ink-2">
              {total === 0 ? (
                hasNarrowing ? 'No internships match your filters' : 'No internships posted yet'
              ) : (
                <>
                  Showing {pageStart}&ndash;{pageEnd} of {total.toLocaleString('en-IN')} internships
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <SaveSearchButton currentParams={params} hasActiveFilters={hasNarrowing} />
              <SortSelect currentParams={params} />
            </div>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col gap-6">
              <div className="rounded-sp-lg border border-dashed border-black/10 bg-sp-bg-elev p-12 text-center">
                <span className="text-3xl">🔍</span>
                <p className="mt-3 font-bold text-sp-navy">
                  {hasNarrowing ? 'No internships match your filters.' : 'No internships posted yet.'}
                </p>
                <p className="mt-1 text-sm text-sp-ink-3">
                  {hasNarrowing
                    ? fallback
                      ? 'Here are some open internships you might still be interested in.'
                      : 'Try broadening your search or filters.'
                    : "We're onboarding new employers — check back soon, or tell us what you're looking for."}
                </p>
              </div>
              <RequestInternshipForm variant="empty-state" />
              {fallback && (
                <div className="flex flex-col gap-4">
                  <h2 className="text-lg font-bold text-sp-navy">
                    {fallbackIsSameCategory
                      ? // params.category may be a comma-joined multi-select
                        // (see FilterSidebar.tsx) — "in X, Y" still reads fine
                        // joined with a comma-space instead of a bare comma.
                        `Other open internships in ${params.category?.split(',').join(', ')}`
                      : 'Internships open right now'}
                  </h2>
                  <div className="flex flex-col gap-3">
                    {fallback.items.map((internship) => (
                      <InternshipListRow key={internship.id} internship={internship} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {items.map((internship) => (
                  <InternshipListRow key={internship.id} internship={internship} />
                ))}
              </div>
              <div className="mt-2">
                <Pagination page={page} totalPages={totalPages} currentParams={params} />
              </div>
              <RequestInternshipForm variant="inline" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
