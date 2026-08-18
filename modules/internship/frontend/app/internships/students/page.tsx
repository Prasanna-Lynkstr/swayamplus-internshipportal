import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';
import { InternshipCard } from '@/components/internships/InternshipCard';
import { Reveal } from '@/components/landing/Reveal';
import { CountUp } from '@/components/landing/CountUp';
import { apiFetch } from '@/lib/api';
import { getServerAuthUser } from '@/lib/serverAuth';
import type { Internship, PaginatedInternships } from '@/lib/types';

const BENEFITS = [
  {
    title: 'Verified employers only',
    body: 'Every organization on SWAYAM Plus is checked by our admin team before a listing goes live.',
  },
  {
    title: 'Apply in one click',
    body: 'Build your profile once — resume, skills, preferences — and reuse it for every internship.',
  },
  {
    title: 'Made for students',
    body: 'No hidden fees, no recruiter spam. Just internships that match what you actually want.',
  },
];

async function getRecentInternships(): Promise<{ items: Internship[]; total: number }> {
  try {
    const result = await apiFetch<PaginatedInternships>('/internships?pageSize=6&sort=newest');
    return { items: result.items, total: result.total };
  } catch {
    return { items: [], total: 0 };
  }
}

export default async function StudentLandingPage() {
  const user = await getServerAuthUser();
  if (user?.role === 'student') redirect('/student/dashboard');

  const { items: recent, total } = await getRecentInternships();

  return (
    <div className="flex flex-col gap-14">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-sp-orange-ink">
            For Students
          </span>
          <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight text-sp-navy sm:text-5xl">
            Find your next internship, verified employers only.
          </h1>
          <p className="mt-4 max-w-lg text-lg text-sp-ink-2">
            Browse real openings, apply with one profile, and track every application from a
            single dashboard — free, always.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {BENEFITS.map((b) => (
              <Card key={b.title} pastel="mint" className="p-4">
                <p className="font-bold text-sp-navy">{b.title}</p>
                <p className="mt-1 text-sm text-sp-ink-2">{b.body}</p>
              </Card>
            ))}
          </div>
        </div>

        <Card className="flex flex-col items-center gap-4 p-8 text-center shadow-sm shadow-black/5">
          <p className="text-sm font-bold uppercase tracking-wide text-sp-ink-3">
            <CountUp value={total} /> internships live right now
          </p>
          <h2 className="text-lg font-bold text-sp-navy">Ready to apply?</h2>
          <p className="text-sm text-sp-ink-3">
            No password needed — verify your email and you&apos;re in, whether you&apos;re new or
            returning.
          </p>
          <LinkButton href="/login?role=student" withArrow>
            Sign in or create your profile
          </LinkButton>
          <LinkButton href="/internships/browse" variant="secondary" withArrow>
            Browse internships without signing in
          </LinkButton>
        </Card>
      </div>

      {recent.length > 0 && (
        <Reveal className="flex flex-col gap-5">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-2xl font-extrabold text-sp-navy">Recently posted</h2>
            <LinkButton href="/internships/browse" variant="secondary">
              View all
            </LinkButton>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recent.map((internship) => (
              <InternshipCard key={internship.id} internship={internship} />
            ))}
          </div>
        </Reveal>
      )}
    </div>
  );
}
