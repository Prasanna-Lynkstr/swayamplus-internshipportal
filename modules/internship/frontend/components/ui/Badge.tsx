import type { ReactNode } from 'react';

type Tone = 'neutral' | 'good' | 'danger' | 'orange';

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-sp-bg-sunken text-sp-ink-2',
  good: 'bg-sp-good-soft text-sp-good',
  danger: 'bg-sp-danger-soft text-sp-danger',
  orange: 'bg-sp-orange-soft text-sp-orange-ink',
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
