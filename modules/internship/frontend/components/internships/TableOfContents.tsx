'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Section {
  id: string;
  label: string;
}

// Only sections that actually render on this specific internship are passed
// in (Eligibility/Responsibilities/Checklist/Apply are all conditional) —
// this never links to an anchor that doesn't exist on the page.
export function TableOfContents({ sections }: { sections: Section[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id);

  useEffect(() => {
    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-15% 0px -70% 0px' },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav className="sticky top-6 hidden flex-col gap-0.5 lg:flex">
      <Link
        href="/internships/browse"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-sp-ink-3 hover:text-sp-navy"
      >
        ← Back to search
      </Link>
      <span className="mb-2 font-mono text-[10.5px] font-bold uppercase tracking-widest text-sp-ink-3">
        On this page
      </span>
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className={`rounded-sp-sm px-2.5 py-1.5 text-sm font-semibold transition-colors ${
            activeId === s.id
              ? 'bg-sp-orange-soft font-bold text-sp-orange-ink'
              : 'text-sp-ink-3 hover:bg-sp-bg-sunken hover:text-sp-navy'
          }`}
        >
          {s.label}
        </a>
      ))}
    </nav>
  );
}
