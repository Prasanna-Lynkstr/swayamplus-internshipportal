import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ApplyForm } from '@/components/internships/ApplyForm';
import { ShareSaveActions } from '@/components/internships/ShareSaveActions';
import { TableOfContents } from '@/components/internships/TableOfContents';
import { EmployerNameTrigger } from '@/components/employers/EmployerNameTrigger';
import { apiFetch, ApiError } from '@/lib/api';
import { googleCalendarUrl } from '@/lib/calendar';
import { modeLabel } from '@/lib/mode';
import { categoryIcon } from '@/lib/categories';
import { getServerAuthUser, getServerAuthToken } from '@/lib/serverAuth';
import type { ApplicationStatus, Internship, InternshipApplication, Student } from '@/lib/types';
import type { TaxonomyOption } from '@/lib/useTaxonomy';

// Server Component — can't use the useTaxonomy client hook, so these two
// admin-managed labels (employmentType/scheduleType display text) are looked
// up directly via the same public endpoint. Falls back to the raw stored
// value if a taxonomy fetch fails or the value was retired after this
// internship was posted, rather than showing nothing.
async function getTaxonomyLabel(listKey: string, value: string): Promise<string> {
  try {
    const options = await apiFetch<TaxonomyOption[]>(`/taxonomies/${listKey}`);
    return options.find((o) => o.value === value)?.label ?? value;
  } catch {
    return value;
  }
}

interface Props {
  params: Promise<{ id: string }>;
}

async function getInternship(id: string, token: string | null): Promise<Internship | null> {
  try {
    return await apiFetch<Internship>(`/internships/${id}`, { token });
  } catch (err) {
    // 404 = no such internship; 400 = a malformed id (e.g. a stale
    // pre-UUID link/bookmark, or a scraper poking sequential numbers) —
    // both should render as "not found," not a 500 page.
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) return null;
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

const EDUCATION_LEVEL_LABELS: Record<string, string> = {
  Any: 'Any degree',
};

const STREAM_LABELS: Record<string, string> = {
  Any: 'Any stream',
};

const LEVEL_LABEL: Record<string, string> = {
  limited: 'Limited',
  moderate: 'Moderate',
  expert: 'Expert',
};

const ANSWER_LABEL: Record<string, string> = {
  yes: 'Yes',
  no: 'No',
};

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
  const orgName = internship.employer?.organizationName ?? 'Organization';
  const [scheduleTypeLabel, employmentTypeLabel] = await Promise.all([
    getTaxonomyLabel('schedule_type', internship.scheduleType),
    getTaxonomyLabel('employment_type', internship.employmentType),
  ]);

  const showEligibility =
    internship.educationLevel ||
    internship.stream ||
    internship.experienceRequired ||
    internship.eligibility.length > 0;
  const showResponsibilities = internship.responsibilities.length > 0;
  const showChecklist = internship.checklistItems.length > 0;

  const tocSections = [
    { id: 'overview', label: 'Overview' },
    showEligibility && { id: 'eligibility', label: 'Eligibility' },
    showResponsibilities && { id: 'responsibilities', label: 'Responsibilities' },
    { id: 'perks', label: 'Perks & details' },
    showChecklist && { id: 'checklist', label: 'Checklist' },
    canApply && { id: 'apply', label: 'Apply' },
  ].filter((s): s is { id: string; label: string } => Boolean(s));

  const applyHref =
    isStudent && !profileComplete && !applicationStatus ? '/register/student' : '#apply';
  const applyLabel = applicationStatus
    ? 'View application status'
    : isStudent && !profileComplete
      ? 'Complete your profile'
      : 'Apply Now';

  return (
    <div className="pb-8">
      {/* TableOfContents renders its own "Back to search" link, but only
          from the lg breakpoint up (where the TOC rail itself shows) — this
          is the mobile/tablet equivalent for everything below that. */}
      <Link
        href="/internships/browse"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-bold text-sp-ink-3 hover:text-sp-navy lg:hidden"
      >
        ← Back to search
      </Link>

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[180px_1fr]">
        <TableOfContents sections={tocSections} />

        <div className="max-w-3xl">
          {/* ---------- title block ---------- */}
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-sp-md bg-sp-pastel-lavender text-lg font-black text-sp-blue">
              {orgName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-[240px] flex-1">
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-sp-navy sm:text-4xl">
                {internship.title}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[15px] font-semibold text-sp-ink-2">
                <EmployerNameTrigger
                  employerId={internship.employerId}
                  orgName={orgName}
                  className="font-bold hover:text-sp-blue hover:underline"
                />
                {internship.employer?.hqCity && (
                  <>
                    <span>&middot;</span>
                    <span>{internship.employer.hqCity}</span>
                  </>
                )}
              </p>
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                <Badge tone="orange">
                  <span className="mr-1">{categoryIcon(internship.category)}</span>
                  {internship.category}
                </Badge>
                <Badge tone="neutral">{modeLabel(internship.mode, 'full')}</Badge>
                <Badge tone="neutral">{employmentTypeLabel}</Badge>
                {internship.skillTags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <ShareSaveActions internshipId={internship.id} title={internship.title} size="md" />
              <a
                href={googleCalendarUrl(internship.title, internship.applicationDeadline)}
                target="_blank"
                rel="noreferrer"
                title="Add deadline to calendar"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-black/5 bg-sp-bg-elev text-sp-ink-3 shadow-sm shadow-black/5 hover:text-sp-navy"
              >
                📅
              </a>
            </div>
          </div>

          {/* ---------- spec strip ---------- */}
          <div className="mt-7 grid grid-cols-2 divide-x divide-black/5 overflow-hidden rounded-sp-lg border border-black/5 bg-sp-bg-elev shadow-sm shadow-black/5 sm:grid-cols-4">
            <div className="p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-sp-ink-3">
                Stipend
              </p>
              <p className="mt-1 font-mono text-sm font-extrabold tabular-nums text-sp-navy">
                {isPaid ? formatStipendRange(internship.stipendMin, internship.stipendMax) : 'Unpaid'}
              </p>
            </div>
            <div className="p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-sp-ink-3">
                Duration
              </p>
              <p className="mt-1 text-sm font-extrabold text-sp-navy">
                {formatDuration(internship.durationWeeks)}
              </p>
            </div>
            <div className="p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-sp-ink-3">
                Openings
              </p>
              <p className="mt-1 font-mono text-sm font-extrabold tabular-nums text-sp-navy">
                {internship.openings}
              </p>
            </div>
            <div className="p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-sp-ink-3">
                Apply by
              </p>
              <p className={`mt-1 text-sm font-extrabold ${deadline.urgent ? 'text-sp-orange-ink' : 'text-sp-navy'}`}>
                {deadline.label}
              </p>
            </div>
          </div>

          {/* ---------- overview ---------- */}
          <section id="overview" className="mt-11 scroll-mt-6">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-sp-orange-ink">
              Overview
            </span>
            <h2 className="mt-2 text-xl font-extrabold tracking-tight text-sp-navy">
              About this internship
            </h2>
            <p className="mt-3.5 whitespace-pre-line text-[15px] leading-relaxed text-sp-ink-2">
              {internship.description}
            </p>
          </section>

          {showEligibility && (
            <>
              <hr className="mt-11 border-black/5" />
              <section id="eligibility" className="mt-11 scroll-mt-6">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-sp-orange-ink">
                  Eligibility
                </span>
                <h2 className="mt-2 text-xl font-extrabold tracking-tight text-sp-navy">
                  Who this is for
                </h2>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {internship.educationLevel && (
                    <Badge tone="orange">
                      {EDUCATION_LEVEL_LABELS[internship.educationLevel] ?? internship.educationLevel}
                    </Badge>
                  )}
                  {internship.stream && (
                    <Badge tone="orange">{STREAM_LABELS[internship.stream] ?? internship.stream}</Badge>
                  )}
                  <Badge tone="orange">
                    {internship.experienceRequired ? 'Experience required' : 'Freshers welcome'}
                  </Badge>
                  {internship.eligibility.map((tag) => (
                    <Badge key={tag} tone="orange">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </section>
            </>
          )}

          {showResponsibilities && (
            <>
              <hr className="mt-11 border-black/5" />
              <section id="responsibilities" className="mt-11 scroll-mt-6">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-sp-orange-ink">
                  Responsibilities
                </span>
                <h2 className="mt-2 text-xl font-extrabold tracking-tight text-sp-navy">
                  What you&apos;ll actually do
                </h2>
                <ul className="mt-3.5 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-sp-ink-2">
                  {internship.responsibilities.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            </>
          )}

          <hr className="mt-11 border-black/5" />
          <section id="perks" className="mt-11 scroll-mt-6">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-sp-orange-ink">
              Perks &amp; details
            </span>
            <h2 className="mt-2 text-xl font-extrabold tracking-tight text-sp-navy">Good to know</h2>
            <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="flex gap-3 rounded-sp-md bg-sp-bg-sunken p-4">
                <span className="text-lg leading-none">🗓️</span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">Work detail</p>
                  <p className="mt-1 text-sm font-semibold text-sp-navy">
                    {internship.workingDays} Days · {scheduleTypeLabel} Work Hours
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-sp-md bg-sp-bg-sunken p-4">
                <span className="text-lg leading-none">🕒</span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">Type / timing</p>
                  <p className="mt-1 text-sm font-semibold text-sp-navy">
                    {modeLabel(internship.mode, 'full')} · {employmentTypeLabel}
                  </p>
                </div>
              </div>
            </div>
            {internship.perks.length > 0 && (
              <div className="mt-2.5 rounded-sp-md bg-sp-bg-sunken p-4">
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-sp-ink-3">Perks</p>
                <div className="flex flex-wrap gap-1.5">
                  {internship.perks.map((perk) => (
                    <Badge key={perk} tone="good">
                      {perk}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </section>

          {showChecklist && (
            <>
              <hr className="mt-11 border-black/5" />
              <section id="checklist" className="mt-11 scroll-mt-6">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-sp-orange-ink">
                  Self-assessment
                </span>
                <h2 className="mt-2 text-xl font-extrabold tracking-tight text-sp-navy">
                  Before you apply
                </h2>
                <p className="mt-1 text-sm text-sp-ink-3">
                  If you apply, you&apos;ll be asked to answer each of these.
                </p>
                <div className="mt-3.5 flex flex-col gap-2.5">
                  {internship.checklistItems.map((c) => {
                    const options =
                      c.type === 'yesno'
                        ? (['yes', 'no'] as const).map((v) => ANSWER_LABEL[v])
                        : (['limited', 'moderate', 'expert'] as const).map((v) => LEVEL_LABEL[v]);
                    return (
                      <div key={c.item} className="rounded-sp-md border border-black/5 p-4">
                        <p className="text-sm font-bold text-sp-navy">{c.item}</p>
                        <div className="mt-2 flex gap-1.5">
                          {options.map((label) => (
                            <span
                              key={label}
                              className="rounded-full border border-black/10 px-3 py-1 text-xs font-bold text-sp-ink-3"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          {canApply && (
            <>
              <hr className="mt-11 border-black/5" />
              <section id="apply" className="mt-11 scroll-mt-6">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-sp-orange-ink">
                  Apply
                </span>
                <h2 className="mt-2 text-xl font-extrabold tracking-tight text-sp-navy">
                  {appliedCount} student{appliedCount === 1 ? '' : 's'} applied so far
                </h2>
                <Card className="mt-3.5 p-6">
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
                    <ApplyForm
                      internshipId={internship.id}
                      checklistItems={internship.checklistItems}
                      initialApplicationStatus={applicationStatus}
                    />
                  )}
                </Card>
              </section>
            </>
          )}

          {!canApply && (
            <p className="mt-11 text-sm text-sp-ink-2">Only student accounts can apply to internships.</p>
          )}
        </div>
      </div>

      {/* ---------- floating action bar ---------- */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-[rgba(255,253,248,0.92)] shadow-[0_-12px_32px_-20px_rgba(13,17,27,0.25)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sp-sm bg-sp-pastel-lavender text-sm font-black text-sp-blue">
              {orgName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-extrabold text-sp-navy">{internship.title}</p>
              <p className="hidden truncate text-xs font-semibold text-sp-ink-3 sm:block">
                {orgName} · {modeLabel(internship.mode)}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black md:inline-flex ${
                deadline.urgent ? 'bg-sp-orange-soft text-sp-orange-ink' : 'bg-sp-bg-sunken text-sp-ink-2'
              }`}
            >
              ⏳ {deadline.label}
            </span>
            {canApply ? (
              <a
                href={applyHref}
                className="inline-flex items-center justify-center rounded-full bg-sp-orange px-6 py-2.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#e2620f] hover:shadow-md"
              >
                {applyLabel}
              </a>
            ) : (
              <span className="text-xs font-semibold text-sp-ink-3">Students only</span>
            )}
          </div>
        </div>
      </div>
      {/* Room for the fixed action bar so it never covers the last section. */}
      <div className="h-20" />
    </div>
  );
}
