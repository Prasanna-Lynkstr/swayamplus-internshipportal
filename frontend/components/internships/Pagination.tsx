import Link from 'next/link';

interface Props {
  page: number;
  totalPages: number;
  currentParams: Record<string, string | undefined>;
}

function hrefForPage(currentParams: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  if (currentParams.q) params.set('q', currentParams.q);
  if (currentParams.location) params.set('location', currentParams.location);
  if (currentParams.category) params.set('category', currentParams.category);
  if (currentParams.mode) params.set('mode', currentParams.mode);
  if (currentParams.employmentType) params.set('employmentType', currentParams.employmentType);
  if (currentParams.sort) params.set('sort', currentParams.sort);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return `/internships${qs ? `?${qs}` : ''}`;
}

export function Pagination({ page, totalPages, currentParams }: Props) {
  if (totalPages <= 1) return null;

  // Keep it to a handful of page links even when there are hundreds of pages.
  const windowStart = Math.max(1, page - 2);
  const windowEnd = Math.min(totalPages, page + 2);
  const pages = Array.from({ length: windowEnd - windowStart + 1 }, (_, i) => windowStart + i);

  const linkClass = (active: boolean) =>
    `flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-bold ${
      active ? 'bg-sp-navy text-white' : 'bg-white text-sp-ink-2 hover:bg-black/5'
    }`;

  return (
    <nav className="flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
      <Link
        href={hrefForPage(currentParams, Math.max(1, page - 1))}
        aria-disabled={page === 1}
        className={`${linkClass(false)} ${page === 1 ? 'pointer-events-none opacity-40' : ''}`}
      >
        ← Prev
      </Link>

      {windowStart > 1 && (
        <>
          <Link href={hrefForPage(currentParams, 1)} className={linkClass(false)}>
            1
          </Link>
          {windowStart > 2 && <span className="px-1 text-sp-ink-3">…</span>}
        </>
      )}

      {pages.map((p) => (
        <Link key={p} href={hrefForPage(currentParams, p)} className={linkClass(p === page)}>
          {p}
        </Link>
      ))}

      {windowEnd < totalPages && (
        <>
          {windowEnd < totalPages - 1 && <span className="px-1 text-sp-ink-3">…</span>}
          <Link href={hrefForPage(currentParams, totalPages)} className={linkClass(false)}>
            {totalPages}
          </Link>
        </>
      )}

      <Link
        href={hrefForPage(currentParams, Math.min(totalPages, page + 1))}
        aria-disabled={page === totalPages}
        className={`${linkClass(false)} ${page === totalPages ? 'pointer-events-none opacity-40' : ''}`}
      >
        Next →
      </Link>
    </nav>
  );
}
