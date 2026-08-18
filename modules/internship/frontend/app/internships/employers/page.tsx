import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';
import { Reveal } from '@/components/landing/Reveal';
import { CountUp } from '@/components/landing/CountUp';
import { apiFetch } from '@/lib/api';
import { getServerAuthUser } from '@/lib/serverAuth';
import type { PlatformStats } from '@/lib/types';

const BENEFITS = [
  {
    title: 'Verified candidates',
    body: 'Every applicant is a real, profiled student — resume, skills, and preferences on file before they apply.',
  },
  {
    title: 'Government-backed platform',
    body: 'SWAYAM Plus is run by the Ministry of Education — a credible channel to reach students nationwide.',
  },
  {
    title: 'No cost to post',
    body: 'Posting internships and reviewing applicants is free for every verified employer.',
  },
];

const EMPTY_STATS: PlatformStats = {
  studentsRegistered: 0,
  employersVerified: 0,
  internshipsPosted: 0,
  internshipsOffered: 0,
};

async function getPlatformStats(): Promise<PlatformStats> {
  try {
    return await apiFetch<PlatformStats>('/platform-stats');
  } catch {
    return EMPTY_STATS;
  }
}

export default async function EmployerLandingPage() {
  const user = await getServerAuthUser();
  if (user?.role === 'employer') redirect('/employer/dashboard');

  const stats = await getPlatformStats();
  const statCards = [
    { label: 'Students registered', value: stats.studentsRegistered },
    { label: 'Internships posted', value: stats.internshipsPosted },
    { label: 'Internships offered', value: stats.internshipsOffered },
  ];

  return (
    <div className="flex flex-col gap-14">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-sp-orange-ink">
            For Employers
          </span>
          <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight text-sp-navy sm:text-5xl">
            Hire your next intern from a government-verified talent pool.
          </h1>
          <p className="mt-4 max-w-lg text-lg text-sp-ink-2">
            Post internships, review applicants with skill self-ratings against your own
            checklist, and manage everything from one dashboard — free, and open to any
            organization our admin team verifies.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {BENEFITS.map((b) => (
              <Card key={b.title} pastel="peach" className="p-4">
                <p className="font-bold text-sp-navy">{b.title}</p>
                <p className="mt-1 text-sm text-sp-ink-2">{b.body}</p>
              </Card>
            ))}
          </div>
        </div>

        <Card className="flex flex-col items-center gap-4 p-8 text-center shadow-sm shadow-black/5">
          <h2 className="text-lg font-bold text-sp-navy">Get started</h2>
          <p className="text-sm text-sp-ink-3">
            Every organization is verified by our admin team before posting — submit an
            Expression of Interest to begin.
          </p>
          <LinkButton href="/internships/employers/eoi" withArrow>
            Submit an Expression of Interest
          </LinkButton>
          <LinkButton href="/login?role=employer" variant="secondary">
            Already approved? Sign in
          </LinkButton>
        </Card>
      </div>

      <Reveal className="flex flex-col gap-5">
        <h2 className="text-2xl font-extrabold text-sp-navy">By the numbers</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {statCards.map((s) => (
            <Card key={s.label} pastel="lavender" className="p-6 text-center">
              <p className="text-3xl font-extrabold text-sp-navy">
                <CountUp value={s.value} />
              </p>
              <p className="mt-1 text-sm font-semibold text-sp-ink-2">{s.label}</p>
            </Card>
          ))}
        </div>
      </Reveal>
    </div>
  );
}
