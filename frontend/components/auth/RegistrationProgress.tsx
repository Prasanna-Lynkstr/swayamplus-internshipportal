// A real multi-step sequence — numbering and a progress trail are earned
// here, not decorative. Shared by the student (4 steps: verify, basic
// details, photo & resume, preferences) and employer (2 steps: verify,
// complete profile) registration flows, so both track the same pattern.
export function RegistrationProgress({ labels, current }: { labels: string[]; current: number }) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-3 sm:gap-x-3">
      {labels.map((label, i) => {
        const n = i + 1;
        return (
          <div key={label} className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold ${
                  current === n
                    ? 'bg-sp-orange text-white'
                    : current > n
                      ? 'bg-sp-good-soft text-sp-good-ink'
                      : 'bg-sp-bg-sunken text-sp-ink-3'
                }`}
              >
                {current > n ? '✓' : n}
              </span>
              <span
                className={`text-sm font-bold ${current >= n ? 'text-sp-navy' : 'text-sp-ink-3'}`}
              >
                {label}
              </span>
            </div>
            {i < labels.length - 1 && <span className="h-px w-5 shrink-0 bg-black/10 sm:w-8" />}
          </div>
        );
      })}
    </div>
  );
}
