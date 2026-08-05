import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ApplyForm } from '@/components/internships/ApplyForm';
import { apiFetch, ApiError } from '@/lib/api';
import type { Internship } from '@/lib/types';

interface Props {
  params: Promise<{ id: string }>;
}

async function getInternship(id: string): Promise<Internship | null> {
  try {
    return await apiFetch<Internship>(`/internships/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

function formatStipend(min: number | null, max: number | null) {
  if (!min && !max) return 'Stipend not disclosed';
  if (min && max && min !== max)
    return `₹${min.toLocaleString('en-IN')} – ₹${max.toLocaleString('en-IN')} / month`;
  return `₹${(min ?? max)?.toLocaleString('en-IN')} / month`;
}

export default async function InternshipDetailPage({ params }: Props) {
  const { id } = await params;
  const internship = await getInternship(id);

  if (!internship) {
    notFound();
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
      <div className="flex flex-col gap-6">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge tone="orange">{internship.domain}</Badge>
            <Badge tone="neutral">{internship.mode}</Badge>
            {internship.status !== 'published' && <Badge tone="danger">{internship.status}</Badge>}
          </div>
          <h1 className="text-3xl font-extrabold text-sp-navy">{internship.title}</h1>
          <p className="mt-1 text-lg font-semibold text-sp-ink-2">
            {internship.employer?.organizationName ?? 'Organization'}
            {internship.employer?.hqCity ? ` · ${internship.employer.hqCity}` : ''}
          </p>
        </div>

        <Card className="p-6">
          <h2 className="mb-2 text-lg font-bold text-sp-navy">About this internship</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-sp-ink-2">
            {internship.description}
          </p>
          {internship.skillTags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {internship.skillTags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3 p-6 text-sm">
          <Row label="Duration" value={`${internship.durationWeeks} weeks`} />
          <Row label="Stipend" value={formatStipend(internship.stipendMin, internship.stipendMax)} />
          <Row label="Openings" value={String(internship.openings)} />
          <Row label="Location" value={internship.location ?? internship.mode} />
          <Row
            label="Apply by"
            value={new Date(internship.applicationDeadline).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          />
        </Card>

        <Card className="p-6">
          <h2 className="mb-3 text-lg font-bold text-sp-navy">Apply</h2>
          <ApplyForm internshipId={internship.id} />
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-black/5 pb-2 last:border-0 last:pb-0">
      <span className="text-sp-ink-3">{label}</span>
      <span className="font-bold text-sp-navy">{value}</span>
    </div>
  );
}
