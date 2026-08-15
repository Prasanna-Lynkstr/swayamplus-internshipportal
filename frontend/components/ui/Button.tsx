import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'light' | 'outline-light';

interface BaseProps {
  variant?: Variant;
  withArrow?: boolean;
  children: ReactNode;
  className?: string;
}

// Each variant is a complete, self-contained class string — never rely on a
// caller's `className` to override a color utility from here via source
// order. Tailwind utilities have equal specificity, so which one "wins" is
// decided by the compiled stylesheet's internal ordering, not by which
// class appears later in the `className` string — appending e.g.
// `text-white` after `primary`'s `text-white` to fight it produces
// unreliable results (this is how a white-on-white button shipped once).
// Add a dedicated variant instead, as with `light`/`outline-light` below,
// which exist specifically for buttons placed on a colored/dark surface
// (e.g. the green closing-CTA band) where `primary`/`secondary` don't read.
const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-sp-orange text-white hover:bg-[#e2620f] shadow-sm shadow-orange-900/10',
  secondary:
    'bg-transparent text-sp-navy border-2 border-sp-navy/15 hover:border-sp-navy/30',
  ghost: 'bg-transparent text-sp-navy hover:bg-black/5',
  light: 'bg-white text-sp-green-from hover:bg-white/90',
  'outline-light': 'bg-transparent text-white border-2 border-white/55 hover:border-white',
};

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 8h9M8.5 3.5 13 8l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Button({
  variant = 'primary',
  withArrow,
  children,
  className = '',
  ...rest
}: BaseProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${BASE} ${VARIANT_CLASSES[variant]} ${className}`} {...rest}>
      {children}
      {withArrow && <Arrow />}
    </button>
  );
}

export function LinkButton({
  href,
  variant = 'primary',
  withArrow,
  children,
  className = '',
}: BaseProps & { href: string }) {
  return (
    <Link href={href} className={`${BASE} ${VARIANT_CLASSES[variant]} ${className}`}>
      {children}
      {withArrow && <Arrow />}
    </Link>
  );
}
