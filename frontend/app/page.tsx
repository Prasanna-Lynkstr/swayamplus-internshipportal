import Link from 'next/link';
import { LinkButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RegisterInterestForm } from '@/components/interest/RegisterInterestForm';
import { apiFetch } from '@/lib/api';
import { getServerAuthUser } from '@/lib/serverAuth';
import type { Internship, PaginatedInternships } from '@/lib/types';

const FEATURES = [
  {
    pastel: 'yellow' as const,
    icon: '🎓',
    title: 'Verified employers',
    body: 'Every organization is checked and approved by the SWAYAM Plus admin team before they can post.',
  },
  {
    pastel: 'peach' as const,
    icon: '🧭',
    title: 'Built for students',
    body: 'One profile — resume, skills, and college details — used across every application.',
  },
  {
    pastel: 'lavender' as const,
    icon: '⚡',
    title: 'Fast applications',
    body: 'Apply in a click with a short cover note, and track every status change in one place.',
  },
  {
    pastel: 'mint' as const,
    icon: '🌐',
    title: 'Remote, hybrid & onsite',
    body: 'Filter by location, category, and work mode to find internships that fit your life.',
  },
];

async function getFeaturedInternships(): Promise<{ featured: Internship[]; total: number }> {
  try {
    const result = await apiFetch<PaginatedInternships>('/internships?pageSize=3');
    return { featured: result.items, total: result.total };
  } catch {
    return { featured: [], total: 0 };
  }
}

interface Props {
  searchParams: Promise<{ sessionExpired?: string }>;
}

export default async function HomePage({ searchParams }: Props) {
  const [{ featured, total }, user, params] = await Promise.all([
    getFeaturedInternships(),
    getServerAuthUser(),
    searchParams,
  ]);
  const isEmployer = user?.role === 'employer';

  return (
    <div className="flex flex-col gap-20">
      {params.sessionExpired === '1' && (
        <div className="mx-auto mt-4 w-full max-w-xl rounded-sp-md bg-sp-orange-soft px-4 py-3 text-center text-sm font-semibold text-sp-orange-ink">
          Your session has expired. Please log in again.
        </div>
      )}
      <section className="flex flex-col items-center gap-6 py-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-sp-navy shadow-sm">
          🚀 <span className="text-sp-orange">{total.toLocaleString('en-IN')}+</span> internships and
          counting
        </span>
        <h1 className="max-w-3xl text-4xl font-extrabold leading-tight text-sp-navy sm:text-5xl">
          Real Internships. Real Employers. Real Experience.
        </h1>
        <p className="max-w-xl text-lg text-sp-ink-2">
          SWAYAM Plus connects students with verified employers for internships that build
          careers — discover, apply, and track it all in one place.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <LinkButton href="/internships" withArrow>
            Browse all internships
          </LinkButton>
          <LinkButton
            href={isEmployer ? '/employer/dashboard' : '/register/employer'}
            variant="secondary"
          >
            {isEmployer ? 'Manage your internships' : 'Post an internship'}
          </LinkButton>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <Card key={f.title} pastel={f.pastel} className="p-6">
            <span className="mb-3 block text-2xl">{f.icon}</span>
            <h3 className="mb-1 text-base font-bold text-sp-navy">{f.title}</h3>
            <p className="text-sm text-sp-ink-2">{f.body}</p>
          </Card>
        ))}
      </section>

      {featured.length > 0 && (
        <section className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-sp-navy">Freshly published</h2>
            <Link href="/internships" className="text-sm font-bold text-sp-blue">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((internship) => (
              <Link
                key={internship.id}
                href={`/internships/${internship.id}`}
                className="rounded-sp-xl border border-black/5 bg-sp-bg-elev p-6 shadow-sm transition-transform hover:-translate-y-0.5"
              >
                <p className="text-xs font-bold text-sp-orange">{internship.category}</p>
                <h3 className="mt-1 text-lg font-bold text-sp-navy">{internship.title}</h3>
                <p className="mt-1 text-sm text-sp-ink-2">
                  {internship.employer?.organizationName ?? 'Organization'}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section id="about" className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {[
          { step: '1', title: 'Build your profile', body: 'Verify with OTP and add your skills, college, and resume.' },
          { step: '2', title: 'Discover internships', body: 'Filter by category, location, and work mode to find the right fit.' },
          { step: '3', title: 'Apply & track', body: 'Apply in a click and follow your application status end to end.' },
        ].map((item) => (
          <div key={item.step} className="rounded-sp-xl bg-white p-6 shadow-sm">
            <span className="text-sm font-black text-sp-orange">STEP {item.step}</span>
            <h3 className="mt-2 text-lg font-bold text-sp-navy">{item.title}</h3>
            <p className="mt-1 text-sm text-sp-ink-2">{item.body}</p>
          </div>
        ))}
      </section>

      {!user && (
        <section className="mx-auto w-full max-w-xl">
          <RegisterInterestForm />
        </section>
      )}
    </div>
  );
}
