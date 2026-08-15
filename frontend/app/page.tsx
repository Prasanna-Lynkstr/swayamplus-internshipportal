import Link from 'next/link';
import { LinkButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Reveal } from '@/components/landing/Reveal';
import { CountUp } from '@/components/landing/CountUp';
import { modeLabel } from '@/lib/mode';
import { apiFetch } from '@/lib/api';
import { getServerAuthUser } from '@/lib/serverAuth';
import type { CategoryCount, Internship, PaginatedInternships } from '@/lib/types';

async function getFeaturedInternships(): Promise<{ featured: Internship[]; total: number }> {
  try {
    const result = await apiFetch<PaginatedInternships>('/internships?pageSize=3');
    return { featured: result.items, total: result.total };
  } catch {
    return { featured: [], total: 0 };
  }
}

async function getCategories(): Promise<CategoryCount[]> {
  try {
    return await apiFetch<CategoryCount[]>('/internships/categories');
  } catch {
    return [];
  }
}

// Positioning/rotation/depth for the 3 floating hero cards — pure Tailwind
// (including arbitrary-value utilities for animation-delay), so no inline
// `style` prop is needed on the shared <Card> component.
const HERO_CARD_VARIANTS = [
  'top-2 left-4 z-30 -rotate-3 opacity-100 [animation-delay:0s]',
  'top-[104px] left-[112px] z-20 rotate-2 opacity-95 [animation-delay:-2.3s]',
  'top-[208px] left-10 z-10 -rotate-1 opacity-90 [animation-delay:-4.6s]',
];

function heroStipendLabel(min: number | null, max: number | null): string {
  if (!min && !max) return 'Unpaid';
  const compact = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}K` : String(n));
  if (min && max && min !== max) return `₹${compact(min)}–${compact(max)}/mo`;
  return `₹${compact((min ?? max) as number)}/mo`;
}

interface Props {
  searchParams: Promise<{ sessionExpired?: string }>;
}

export default async function HomePage({ searchParams }: Props) {
  const [{ featured, total }, categories, user, params] = await Promise.all([
    getFeaturedInternships(),
    getCategories(),
    getServerAuthUser(),
    searchParams,
  ]);
  const isEmployer = user?.role === 'employer';
  const heroCards = featured.slice(0, 3);

  return (
    <div className="flex flex-col gap-24">
      {params.sessionExpired === '1' && (
        <div className="mx-auto mt-4 w-full max-w-xl rounded-sp-md bg-sp-orange-soft px-4 py-3 text-center text-sm font-semibold text-sp-orange-ink">
          Your session has expired. Please log in again.
        </div>
      )}

      {/* ---------- hero ---------- */}
      <section className="relative overflow-hidden pb-4">
        <div className="sp-hero-mesh pointer-events-none absolute -inset-x-10 -top-1/4 h-[780px]" />
        <div className="relative grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-sp-bg-elev px-3.5 py-1.5 text-xs font-bold text-sp-navy shadow-sm">
              <span className="sp-pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-sp-good text-sp-good" />
              <span className="font-mono">
                <CountUp value={total} />
              </span>{' '}
              internships live right now
            </span>
            <h1 className="mt-5 max-w-xl text-4xl font-black leading-[1.05] tracking-tight text-sp-navy sm:text-5xl lg:text-6xl">
              Verified internships.
              <br />
              Zero <span className="text-sp-orange-ink">guesswork.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg font-medium leading-relaxed text-sp-ink-2">
              SWAYAM Plus connects students with government-verified employers — discover roles
              that fit, apply in one click, and track every step until you&apos;re hired.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <LinkButton href="/internships" withArrow>
                Browse internships
              </LinkButton>
              <LinkButton
                href={isEmployer ? '/employer/dashboard' : '/register/employer'}
                variant="secondary"
              >
                {isEmployer ? 'Manage your internships' : 'Post an internship'}
              </LinkButton>
            </div>
            <p className="mt-6 text-sm font-semibold text-sp-ink-2">
              Every employer is checked by the SWAYAM Plus admin team before a listing goes live.
            </p>
          </div>

          <div className="relative hidden h-[420px] sm:block">
            {heroCards.map((internship, i) => {
              const isPaid = Boolean(internship.stipendMin || internship.stipendMax);
              const orgName = internship.employer?.organizationName ?? 'Organization';
              const variant = HERO_CARD_VARIANTS[i] ?? HERO_CARD_VARIANTS[0];
              return (
                <Card
                  key={internship.id}
                  className={`animate-sp-float absolute w-[280px] p-4 ${variant}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sp-sm bg-sp-pastel-lavender text-xs font-black text-sp-blue">
                        {orgName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-sp-navy">
                          {internship.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs font-semibold text-sp-ink-3">
                          {orgName} &middot; {modeLabel(internship.mode)}
                        </p>
                      </div>
                    </div>
                    <Badge tone={isPaid ? 'good' : 'neutral'}>
                      {heroStipendLabel(internship.stipendMin, internship.stipendMax)}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge tone="orange">{internship.category}</Badge>
                    {internship.eligibility[0] && (
                      <Badge tone="neutral">{internship.eligibility[0]}</Badge>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- freshly published (real listings) ---------- */}
      {heroCards.length > 0 && (
        <Reveal>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-sp-navy">Freshly published</h2>
            <Link href="/internships" className="text-sm font-bold text-sp-blue">
              View all &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((internship) => (
              <Link
                key={internship.id}
                href={`/internships/${internship.id}`}
                className="rounded-sp-xl border border-black/5 bg-sp-bg-elev p-6 shadow-sm shadow-black/5 transition-transform hover:-translate-y-0.5"
              >
                <p className="text-xs font-bold text-sp-orange-ink">{internship.category}</p>
                <h3 className="mt-1 text-lg font-bold text-sp-navy">{internship.title}</h3>
                <p className="mt-1 text-sm text-sp-ink-2">
                  {internship.employer?.organizationName ?? 'Organization'}
                </p>
              </Link>
            ))}
          </div>
        </Reveal>
      )}

      {/* ---------- why swayam plus (bento) ---------- */}
      <Reveal>
        <div className="mb-10 max-w-xl">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-sp-orange-ink">
            Why SWAYAM Plus
          </span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-sp-navy sm:text-4xl">
            Everything you need, none of the noise.
          </h2>
          <p className="mt-3 text-base text-sp-ink-2">
            Built as one focused workflow instead of a job-board free-for-all — for students who
            want a real shot, and employers who want real signal.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[180px]">
          <Card pastel="peach" className="flex flex-col justify-between p-6 lg:col-span-2">
            <div>
              <h3 className="text-lg font-extrabold text-sp-navy">
                Verified employers, not job-board noise
              </h3>
              <p className="mt-1.5 text-sm text-sp-ink-2">
                Every organization is checked by the SWAYAM Plus admin team before a single
                listing goes live.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone="neutral">Pending</Badge>
              <span className="text-sp-ink-3">&rarr;</span>
              <Badge tone="good">Approved</Badge>
              <span className="text-sp-ink-3">&rarr;</span>
              <Badge tone="orange">Live</Badge>
            </div>
          </Card>

          <Card pastel="yellow" className="flex flex-col justify-between p-6">
            <h3 className="text-lg font-extrabold text-sp-navy">Live &amp; growing</h3>
            <p className="font-mono text-4xl font-bold tracking-tight text-sp-navy">
              <CountUp value={total} />
            </p>
          </Card>

          <Card pastel="lavender" className="flex flex-col justify-between p-6 lg:row-span-2">
            <div>
              <h3 className="text-lg font-extrabold text-sp-navy">
                One profile, every application
              </h3>
              <p className="mt-1.5 text-sm text-sp-ink-2">
                Resume, skills, and college details — filled in once, reused everywhere you apply.
              </p>
            </div>
            <div className="mt-4 flex flex-col gap-2.5">
              {[
                { label: 'Applied', done: true },
                { label: 'Shortlisted', done: true },
                { label: 'Interviewing', done: false, current: true },
                { label: 'Offer', done: false },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2.5 text-sm font-bold">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      s.done ? 'bg-sp-good' : s.current ? 'bg-sp-orange' : 'bg-black/15'
                    }`}
                  />
                  <span className={s.done ? 'text-sp-navy' : 'text-sp-ink-2'}>{s.label}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card pastel="mint" className="flex flex-col justify-between p-6">
            <h3 className="text-lg font-extrabold text-sp-navy">Any way you work</h3>
            <div className="flex flex-wrap gap-2">
              {['Remote', 'Hybrid', 'Onsite'].map((m) => (
                <span
                  key={m}
                  className="rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-bold text-sp-ink-2"
                >
                  {m}
                </span>
              ))}
            </div>
          </Card>

          <Card pastel="peach" className="flex flex-col justify-between p-6 lg:col-span-2">
            <div>
              <h3 className="text-lg font-extrabold text-sp-navy">Built for freshers too</h3>
              <p className="mt-1.5 text-sm text-sp-ink-2">
                Employers can mark a role open to &ldquo;any degree&rdquo; or &ldquo;any
                stream&rdquo; — so you&apos;re never filtered out before you&apos;re even
                considered.
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              <Badge tone="orange">Any degree</Badge>
              <Badge tone="orange">Any stream</Badge>
            </div>
          </Card>
        </div>
      </Reveal>

      {/* ---------- by the numbers (real stats only) ---------- */}
      <Reveal>
        <div className="rounded-sp-xl border border-black/5 bg-sp-bg-sunken p-10 shadow-sm shadow-black/5 sm:p-14">
          <div className="mb-10 flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-sp-orange-ink">
              By the numbers
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-sp-bg-elev px-3.5 py-1.5 text-xs font-bold text-sp-navy shadow-sm">
              <span className="sp-pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-sp-good text-sp-good" />
              Updated in real time
            </span>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div>
              <p className="font-mono text-4xl font-bold tracking-tight text-sp-navy sm:text-5xl">
                <CountUp value={total} />
              </p>
              <p className="mt-2 text-sm font-semibold text-sp-ink-2">
                Internships live right now
              </p>
            </div>
            <div className="border-l border-black/10 pl-8">
              <p className="font-mono text-4xl font-bold tracking-tight text-sp-navy sm:text-5xl">
                <CountUp value={categories.length} />
              </p>
              <p className="mt-2 text-sm font-semibold text-sp-ink-2">Categories to explore</p>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ---------- how it works ---------- */}
      <Reveal>
        <div className="mb-12 max-w-xl">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-sp-orange-ink">
            How it works
          </span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-sp-navy sm:text-4xl">
            Three steps. No detours.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {[
            {
              n: '01',
              tone: 'text-sp-orange-ink',
              title: 'Verify your email',
              body: "We send a one-time code to confirm it's you before you get started.",
              visual: (
                <div className="flex gap-1.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex h-8 w-6 items-center justify-center rounded-sp-sm border border-black/10 bg-sp-bg-elev font-mono text-sm font-bold text-sp-ink-3 shadow-sm"
                    >
                      &middot;
                    </div>
                  ))}
                </div>
              ),
            },
            {
              n: '02',
              tone: 'text-sp-blue',
              title: 'Build your profile once',
              body: 'Skills, resume, and preferences — reused across every application you send.',
              visual: (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-sp-sm bg-sp-pastel-lavender text-[11px] font-black text-sp-blue">
                    P
                  </div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-sp-bg-sunken">
                    <div className="h-full w-[82%] rounded-full bg-sp-blue" />
                  </div>
                  <span className="font-mono text-xs font-bold text-sp-ink-3">82%</span>
                </div>
              ),
            },
            {
              n: '03',
              tone: 'text-sp-good-ink',
              title: 'Apply, track, get hired',
              body: 'One click to apply — live status updates from "Applied" all the way to "Offer."',
              visual: <Badge tone="good">Offer received</Badge>,
            },
          ].map((step) => (
            <div key={step.n}>
              <div className={`flex h-14 w-14 items-center justify-center rounded-full border border-black/10 bg-sp-bg-elev font-mono text-lg font-bold shadow-sm ${step.tone}`}>
                {step.n}
              </div>
              <h3 className="mt-5 text-lg font-extrabold text-sp-navy">{step.title}</h3>
              <p className="mt-2 max-w-[30ch] text-sm text-sp-ink-2">{step.body}</p>
              <div className="mt-4 rounded-sp-md border border-black/5 bg-sp-bg-elev p-3.5 shadow-sm shadow-black/5">
                {step.visual}
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* ---------- closing CTA ---------- */}
      <Reveal>
        <div className="sp-green-gradient relative overflow-hidden rounded-sp-xl p-10 text-white sm:p-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(420px_320px_at_85%_-10%,rgba(255,255,255,0.16),transparent_60%)]" />
          <div className="relative flex flex-wrap items-center justify-between gap-8">
            <div>
              <h2 className="max-w-[20ch] text-3xl font-extrabold tracking-tight sm:text-4xl">
                Your next internship is already live.
              </h2>
              <p className="mt-3 max-w-md text-white">
                Join the platform government-verified employers actually use to hire interns.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <LinkButton href="/internships" variant="light">
                I&apos;m a student &mdash; browse internships
              </LinkButton>
              <LinkButton
                href={isEmployer ? '/employer/dashboard' : '/register/employer'}
                variant="outline-light"
              >
                I&apos;m an employer &mdash; post a role
              </LinkButton>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
