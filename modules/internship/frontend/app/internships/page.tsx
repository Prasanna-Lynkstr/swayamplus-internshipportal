import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';
import { CountUp } from '@/components/landing/CountUp';
import { Reveal } from '@/components/landing/Reveal';
import { InternshipCard } from '@/components/internships/InternshipCard';
import { categoryIcon } from '@/lib/categories';
import { apiFetch } from '@/lib/api';
import type { CategoryCount, Internship, PaginatedInternships } from '@/lib/types';

async function getLiveInternships(): Promise<{ items: Internship[]; total: number }> {
  try {
    const result = await apiFetch<PaginatedInternships>('/internships?pageSize=6&sort=newest');
    return { items: result.items, total: result.total };
  } catch {
    return { items: [], total: 0 };
  }
}

// Only categories with something to actually show, ranked by supply — the
// point of this row is "look how much is live," not a complete taxonomy
// listing (that's what the browse page's filter sidebar is for).
async function getTrendingCategories(): Promise<CategoryCount[]> {
  try {
    const categories = await apiFetch<CategoryCount[]>('/internships/categories');
    return categories
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  } catch {
    return [];
  }
}

// The "Internships" nav item's destination — a marketing hub for both
// audiences, not the filtered browse page (that moved to /internships/browse
// specifically so this route could become a real front door instead of
// dropping every visitor straight into a results page with no context for
// who this platform is even for). The role split stays the first decision a
// visitor makes; everything below it is there to make "there's real,
// current opportunity here" obvious before they leave without clicking
// either card.
export default async function InternshipsHubPage() {
  const [{ items: liveInternships, total }, trendingCategories] = await Promise.all([
    getLiveInternships(),
    getTrendingCategories(),
  ]);

  return (
    <div className="flex flex-col gap-16">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-10 py-6 text-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-sp-bg-elev px-3.5 py-1.5 text-xs font-bold text-sp-navy shadow-sm">
            <span className="sp-pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-sp-good text-sp-good" />
            <span className="font-mono">
              <CountUp value={total} />
            </span>{' '}
            internships live right now
          </span>
          <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-sp-navy sm:text-5xl lg:text-6xl">
            SWAYAM Plus Internships
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg font-medium leading-relaxed text-sp-ink-2">
            A government-run marketplace connecting students with verified employers — free for
            both sides, with every organization checked before a listing goes live.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
          <Card pastel="mint" className="flex flex-col items-center gap-4 p-8">
            <span className="text-3xl">🎓</span>
            <h2 className="text-xl font-extrabold text-sp-navy">I&apos;m looking for internships</h2>
            <p className="text-sm text-sp-ink-2">
              Browse verified openings, apply with one profile, and track every application.
            </p>
            <LinkButton href="/internships/students" withArrow>
              Continue as a student
            </LinkButton>
          </Card>

          <Card pastel="peach" className="flex flex-col items-center gap-4 p-8">
            <span className="text-3xl">🏢</span>
            <h2 className="text-xl font-extrabold text-sp-navy">I&apos;m an employer</h2>
            <p className="text-sm text-sp-ink-2">
              Post internships and hire from a government-verified talent pool, free of cost.
            </p>
            <LinkButton href="/internships/employers" withArrow>
              Continue as an employer
            </LinkButton>
          </Card>
        </div>
      </div>

      {trendingCategories.length > 0 && (
        <Reveal>
          <div className="mb-5">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-sp-orange-ink">
              Browse by category
            </span>
            <h2 className="mt-2 text-2xl font-extrabold text-sp-navy">What are you into?</h2>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {trendingCategories.map((c) => (
              <Link
                key={c.category}
                href={`/internships/browse?category=${encodeURIComponent(c.category)}`}
                className="flex items-center gap-2 rounded-full border border-black/10 bg-sp-bg-elev px-4 py-2.5 text-sm font-bold text-sp-navy shadow-sm shadow-black/5 transition-colors hover:border-sp-orange/40 hover:bg-sp-orange-soft"
              >
                <span>{categoryIcon(c.category)}</span>
                {c.category}
                <span className="rounded-full bg-sp-bg-sunken px-2 py-0.5 font-mono text-xs text-sp-ink-3">
                  {c.count}
                </span>
              </Link>
            ))}
          </div>
        </Reveal>
      )}

      {liveInternships.length > 0 && (
        <Reveal>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-sp-orange-ink">
                Fresh off the press
              </span>
              <h2 className="mt-2 text-2xl font-extrabold text-sp-navy">Live right now</h2>
            </div>
            <Link href="/internships/browse" className="text-sm font-bold text-sp-blue">
              View all {total}+ &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {liveInternships.map((internship) => (
              <InternshipCard key={internship.id} internship={internship} />
            ))}
          </div>
        </Reveal>
      )}

      <Reveal>
        <div className="sp-green-gradient relative overflow-hidden rounded-sp-xl p-10 text-white sm:p-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(420px_320px_at_85%_-10%,rgba(255,255,255,0.16),transparent_60%)]" />
          <div className="relative flex flex-wrap items-center justify-between gap-8">
            <div>
              <h2 className="max-w-[22ch] text-3xl font-extrabold tracking-tight sm:text-4xl">
                {total}+ internships live. What are you waiting for?
              </h2>
              <p className="mt-3 max-w-md text-white">
                Free for students, free for verified employers — no catch, no hidden fees.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <LinkButton href="/internships/browse" variant="light" withArrow>
                I&apos;m a student &mdash; browse internships
              </LinkButton>
              <LinkButton href="/internships/employers" variant="outline-light">
                I&apos;m an employer &mdash; post a role
              </LinkButton>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
