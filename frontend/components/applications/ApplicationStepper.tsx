import type { ApplicationStatus } from '@/lib/types';

const STAGES: { key: ApplicationStatus; label: string }[] = [
  { key: 'applied', label: 'Applied' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'interviewing', label: 'Interviewing' },
  { key: 'offered', label: 'Offered' },
];

// Rejected/withdrawn aren't points on this forward pipeline — they're exits
// from it, from whatever stage the application had reached. Callers render
// those as a plain status badge instead of asking this component for a
// stepper that doesn't make sense for them.
export function ApplicationStepper({ status }: { status: ApplicationStatus }) {
  const currentIndex = STAGES.findIndex((s) => s.key === status);
  if (currentIndex === -1) return null;

  return (
    <div className="flex items-center">
      {STAGES.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <span
              className={`h-2.5 w-2.5 rounded-full ${i <= currentIndex ? 'bg-sp-good' : 'bg-black/15'}`}
            />
            <span
              className={`text-[11px] font-bold whitespace-nowrap ${
                i <= currentIndex ? 'text-sp-navy' : 'text-sp-ink-3'
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < STAGES.length - 1 && (
            <div
              className={`mb-4 h-0.5 w-6 sm:w-10 ${i < currentIndex ? 'bg-sp-good' : 'bg-black/10'}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
