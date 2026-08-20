import { Card } from '@/components/ui/Card';

// Next.js shows this automatically (via the implicit Suspense boundary
// around page.tsx) both on first load and whenever browse re-fetches after
// a search/filter/sort/page change, since those all push a new searchParams
// URL that re-runs the async server component.
function ResultRowSkeleton() {
  return (
    <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-sp-sm bg-sp-bg-sunken" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="h-4 w-2/3 max-w-64 animate-pulse rounded-full bg-sp-bg-sunken" />
            <div className="h-3 w-1/3 max-w-32 animate-pulse rounded-full bg-sp-bg-sunken" />
          </div>
        </div>
        <div className="h-3 w-1/2 max-w-80 animate-pulse rounded-full bg-sp-bg-sunken" />
        <div className="flex gap-2">
          <div className="h-5 w-16 animate-pulse rounded-full bg-sp-bg-sunken" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-sp-bg-sunken" />
          <div className="h-5 w-14 animate-pulse rounded-full bg-sp-bg-sunken" />
        </div>
      </div>
      <div className="h-6 w-24 shrink-0 animate-pulse rounded-full bg-sp-bg-sunken" />
    </Card>
  );
}

export default function BrowseLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-sp-orange-ink">
            Browse
          </span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-sp-navy sm:text-4xl">
            Find your internship
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[272px_1fr]">
        <div className="hidden animate-pulse rounded-sp-lg border border-black/5 bg-sp-bg-elev lg:block lg:h-96" />

        <div className="flex flex-col gap-4">
          <div className="h-[52px] animate-pulse rounded-sp-lg border border-black/5 bg-sp-bg-elev" />

          <div className="flex items-center justify-between gap-2">
            <div className="h-4 w-40 animate-pulse rounded-full bg-sp-bg-sunken" />
            <div className="h-8 w-28 animate-pulse rounded-full bg-sp-bg-sunken" />
          </div>

          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <ResultRowSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
