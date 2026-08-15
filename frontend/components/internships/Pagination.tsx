import Link from 'next/link';
import { buildInternshipsHref } from '@/lib/internshipFilters';
import type { InternshipFilterParams } from '@/lib/internshipFilters';

interface Props {
  page: number;
  totalPages: number;
  currentParams: InternshipFilterParams;
}

export function Pagination({ page, totalPages, currentParams }: Props) {
  if (totalPages <= 1) return null;

  // Keep it to a handful of page links even when there are hundreds of pages.
  const windowStart = Math.max(1, page - 2);
  const windowEnd = Math.min(totalPages, page + 2);
  const pages = Array.from({ length: windowEnd - windowStart + 1 }, (_, i) => windowStart + i);

  const linkClass = (active: boolean) =>
    `flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-bold ${
      active ? 'bg-sp-navy text-white' : 'bg-sp-bg-elev text-sp-ink-2 shadow-sm shadow-black/5 hover:bg-black/5'
    }`;

  const hrefForPage = (p: number) => buildInternshipsHref(currentParams, { page: String(p) });

  return (
    <nav className="flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
      <Link
        href={hrefForPage(Math.max(1, page - 1))}
        aria-disabled={page === 1}
        className={`${linkClass(false)} ${page === 1 ? 'pointer-events-none opacity-40' : ''}`}
      >
        ← Prev
      </Link>

      {windowStart > 1 && (
        <>
          <Link href={hrefForPage(1)} className={linkClass(false)}>
            1
          </Link>
          {windowStart > 2 && <span className="px-1 text-sp-ink-3">…</span>}
        </>
      )}

      {pages.map((p) => (
        <Link key={p} href={hrefForPage(p)} className={linkClass(p === page)}>
          {p}
        </Link>
      ))}

      {windowEnd < totalPages && (
        <>
          {windowEnd < totalPages - 1 && <span className="px-1 text-sp-ink-3">…</span>}
          <Link href={hrefForPage(totalPages)} className={linkClass(false)}>
            {totalPages}
          </Link>
        </>
      )}

      <Link
        href={hrefForPage(Math.min(totalPages, page + 1))}
        aria-disabled={page === totalPages}
        className={`${linkClass(false)} ${page === totalPages ? 'pointer-events-none opacity-40' : ''}`}
      >
        Next →
      </Link>
    </nav>
  );
}
