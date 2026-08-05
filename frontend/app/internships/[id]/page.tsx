import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ApplyForm } from '@/components/internships/ApplyForm';
import { ShareSaveActions } from '@/components/internships/ShareSaveActions';
import { apiFetch, ApiError } from '@/lib/api';
import { googleCalendarUrl } from '@/lib/calendar';
import { modeLabel } from '@/lib/mode';
import { getServerAuthUser, getServerAuthToken } from '@/lib/serverAuth';
import type { ApplicationStatus, Internship, InternshipApplication, Student } from '@/lib/types';

interface Props {
  params: Promise<{ id: string }>;
}

async function getInternship(id: string, token: string | null): Promise<Internship | null> {
  try {
    return await apiFetch<Internship>(`/internships/${id}`, { token });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

async function getMyApplicationStatus(
  id: string,
  token: string | null,
): Promise<ApplicationStatus | null> {
  if (!token) return null;
  try {
    const application = await apiFetch<InternshipApplication | null>(
      `/internships/${id}/my-application`,
      { token },
    );
    return application?.status ?? null;
  } catch {
    return null;
  }
}

async function getProfileComplete(token: string | null): Promise<boolean> {
  if (!token) return false;
  try {
    const student = await apiFetch<Student>('/students/me', { token });
    return student.profileComplete ?? false;
  } catch {
    return false;
  }
}

function formatStipendRange(min: number | null, max: number | null): string {
  if (!min && !max) return 'Unpaid';
  if (min && max && min !== max)
    return `₹${min.toLocaleString('en-IN')} – ₹${max.toLocaleString('en-IN')} / month`;
  return `₹${(min ?? max)?.toLocaleString('en-IN')} / month`;
}

function formatDuration(weeks: number): string {
  if (weeks % 4 === 0) {
    const months = weeks / 4;
    return `${months} month${months === 1 ? '' : 's'}`;
  }
  return `${weeks} week${weeks === 1 ? '' : 's'}`;
}

function daysLeft(deadline: string): { label: string; urgent: boolean } {
  const ms = new Date(deadline).getTime() - Date.now();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return { label: 'Closing Today', urgent: true };
  if (days === 1) return { label: '1 Day Left', urgent: true };
  return { label: `${days} Days Left`, urgent: days <= 5 };
}

export default async function InternshipDetailPage({ params }: Props) {
  const { id } = await params;
  const [user, token] = await Promise.all([getServerAuthUser(), getServerAuthToken()]);
  const internship = await getInternship(id, token);

  if (!internship) {
    notFound();
  }

  const isStudent = user?.role === 'student';
  const canApply = !user || isStudent;
  const [applicationStatus, profileComplete] = await Promise.all([
    isStudent ? getMyApplicationStatus(id, token) : Promise.resolve(null),
    isStudent ? getProfileComplete(token) : Promise.resolve(true),
  ]);

  const isPaid = Boolean(internship.stipendMin || internship.stipendMax);
  const deadline = daysLeft(internship.applicationDeadline);
  const appliedCount = internship.applicationsCount ?? 0;

  const additionalInfo = [
    { label: 'Internship Duration', value: formatDuration(internship.durationWeeks) },
    {
      label: 'Internship Type',
      value: isPaid ? formatStipendRange(internship.stipendMin, internship.stipendMax) : 'Unpaid',
    },
    {
      label: 'Work Detail',
      value: `${internship.workingDays} Days · ${
        internship.scheduleType === 'fixed' ? 'Fixed Work Hours' : 'Flexible Work Hours'
      }`,
    },
    {
      label: 'Type / Timing',
      value: `${modeLabel(internship.mode, 'full')} · ${
        internship.employmentType === 'part-time' ? 'Part-time' : 'Full-time'
      }`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
      <div className="flex flex-col gap-6">
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Badge tone="neutral">{modeLabel(internship.mode, 'full')}</Badge>
              <h1 className="mt-3 text-2xl font-extrabold text-sp-navy sm:text-3xl">
                {internship.title}
              </h1>
              <p className="mt-1 text-lg font-semibold text-sp-ink-2">
                {internship.employer?.organizationName ?? 'Organization'}
                {internship.employer?.hqCity ? ` · ${internship.employer.hqCity}` : ''}
              </p>
              <p className="mt-1 text-sm text-sp-ink-3">
                {internship.openings} opening{internship.openings === 1 ? '' : 's'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <ShareSaveActions internshipId={internship.id} title={internship.title} size="md" />
              <a
                href={googleCalendarUrl(internship.title, internship.applicationDeadline)}
                target="_blank"
                rel="noreferrer"
                title="Add deadline to calendar"
                className="flex h-9 w-9 items-center justify-center rounded-full text-sp-ink-3 hover:bg-black/5 hover:text-sp-navy"
              >
                📅
              </a>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <Badge tone="orange">{internship.category}</Badge>
            {internship.skillTags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-3 text-lg font-bold text-sp-navy">About this internship</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-sp-ink-2">
            {internship.description}
          </p>
        </Card>

        {internship.eligibility.length > 0 && (
          <Card className="p-6">
            <h2 className="mb-3 text-lg font-bold text-sp-navy">Eligibility</h2>
            <div className="flex flex-wrap gap-2">
              {internship.eligibility.map((tag) => (
                <Badge key={tag} tone="orange">
                  {tag}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {internship.responsibilities.length > 0 && (
          <Card className="p-6">
            <h2 className="mb-3 text-lg font-bold text-sp-navy">Responsibilities</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-sp-ink-2">
              {internship.responsibilities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="p-6">
          <h2 className="mb-3 text-lg font-bold text-sp-navy">Additional Information</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {additionalInfo.map((item) => (
              <div key={item.label} className="rounded-sp-md bg-sp-bg-sunken p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-sp-navy">{item.value}</p>
              </div>
            ))}
            {internship.perks.length > 0 && (
              <div className="rounded-sp-md bg-sp-bg-sunken p-4 sm:col-span-2">
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-sp-ink-3">
                  Perks
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {internship.perks.map((perk) => (
                    <Badge key={perk} tone="good">
                      {perk}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {canApply && (
          <Card id="apply" className="scroll-mt-6 p-6">
            <h2 className="mb-3 text-lg font-bold text-sp-navy">Apply</h2>
            {isStudent && !profileComplete && !applicationStatus ? (
              <div className="rounded-sp-lg bg-sp-bg-sunken p-5 text-sm text-sp-ink-2">
                <p className="font-semibold text-sp-navy">Complete your profile before applying.</p>
                <p className="mt-1">
                  Employers need your name, contact details, and resume to review your
                  application.
                </p>
                <Link href="/register/student" className="mt-2 inline-block font-bold text-sp-blue">
                  Complete your profile
                </Link>
              </div>
            ) : (
              <ApplyForm internshipId={internship.id} initialApplicationStatus={applicationStatus} />
            )}
          </Card>
        )}
      </div>

      <div className="lg:sticky lg:top-24 lg:h-fit">
        <Card className="flex flex-col gap-3 border-2 border-sp-orange/20 p-6">
          <p className={`text-sm font-black ${deadline.urgent ? 'text-sp-orange' : 'text-sp-ink-2'}`}>
            ⏳ {deadline.label}
          </p>
          {canApply ? (
            <>
              <p className="text-sm text-sp-ink-2">
                {applicationStatus
                  ? 'See your application status below.'
                  : isStudent && !profileComplete
                    ? 'Complete your profile to apply — employers need your name and resume.'
                    : 'Apply now — spots fill up fast for internships like this one.'}
              </p>
              <a
                href={isStudent && !profileComplete && !applicationStatus ? '/register/student' : '#apply'}
                className="inline-flex w-full items-center justify-center rounded-full bg-sp-orange px-6 py-3 text-sm font-bold text-white hover:bg-[#e2620f]"
              >
                {applicationStatus
                  ? 'View application status'
                  : isStudent && !profileComplete
                    ? 'Complete your profile'
                    : 'Apply Now'}
              </a>
            </>
          ) : (
            <p className="text-sm text-sp-ink-2">Only student accounts can apply to internships.</p>
          )}
          <p className="text-center text-xs font-semibold text-sp-ink-3">
            {appliedCount} student{appliedCount === 1 ? '' : 's'} applied so far
          </p>
        </Card>
      </div>
    </div>
  );
}
