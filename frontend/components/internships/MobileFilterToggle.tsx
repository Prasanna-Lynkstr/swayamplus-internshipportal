'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

// The sidebar itself (passed as `children`) is a plain Server Component — no
// client JS needed for the filters themselves, since every filter is a
// real link. This wrapper only owns the one thing that genuinely needs
// client state: whether that sidebar is visible on a small screen.
export function MobileFilterToggle({
  children,
  activeCount,
}: {
  children: ReactNode;
  activeCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-sp-bg-elev px-4 py-2.5 text-sm font-bold text-sp-navy shadow-sm shadow-black/5 lg:hidden"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="8" y1="12" x2="16" y2="12" />
          <line x1="11" y1="18" x2="13" y2="18" />
        </svg>
        Filters{activeCount > 0 ? ` · ${activeCount}` : ''}
      </button>
      <div className={`${open ? 'block' : 'hidden'} lg:block`}>{children}</div>
    </div>
  );
}
