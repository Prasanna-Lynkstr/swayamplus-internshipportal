'use client';

import { useState } from 'react';
import { normalizeExternalUrl } from '@/lib/externalUrl';

// Shared building blocks for the "review someone's full submitted profile"
// modals (applicant profile for employers, EOI detail for admins) — both
// need a compact phone/email row and a row of link chips that stay visible
// even when a given link wasn't provided, rather than silently vanishing.

export function IconPhone() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C9.4 21 3 14.6 3 6c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1l-2.3 2.2Z" />
    </svg>
  );
}

export function IconMail() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4-8 5-8-5V6l8 5 8-5Z" />
    </svg>
  );
}

// Every place an employer sees a candidate's phone/email — this button plus
// the "copied" flash beside it — so calling/emailing them doesn't require
// retyping a number or address by hand off the screen.
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? 'Copied!' : `Copy ${label}`}
      aria-label={copied ? 'Copied!' : `Copy ${label}`}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sp-ink-3 hover:bg-black/5 hover:text-sp-navy"
    >
      {copied ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M4 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="9" y="9" width="12" height="12" rx="2" />
          <path d="M5 15V5a2 2 0 0 1 2-2h10" />
        </svg>
      )}
    </button>
  );
}

export function ContactRow({
  icon,
  value,
  label = 'contact',
}: {
  icon: React.ReactNode;
  value: string | null | undefined;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-sp-ink-3">
        {icon}
      </span>
      <span className={`flex-1 ${value ? 'text-sp-ink-2' : 'text-sp-ink-3'}`}>{value || 'Not provided'}</span>
      {value && <CopyButton value={value} label={label} />}
    </div>
  );
}

// Always renders, present or not — an *absent* link still shows as a muted,
// non-interactive "Not provided" pill rather than disappearing outright. A
// link that vanishes with no trace reads exactly like a bug the moment one
// of several expected links is missing (see the My Skills Plus case this
// pattern was built for).
export function LinkChip({ label, href, accent }: { label: string; href: string | null | undefined; accent?: boolean }) {
  if (!href) {
    return (
      <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-sp-ink-3">
        {label}: not provided
      </span>
    );
  }
  return (
    <a
      href={normalizeExternalUrl(href)}
      target="_blank"
      rel="noreferrer"
      className={`rounded-full px-3 py-1.5 text-xs font-bold hover:opacity-80 ${
        accent ? 'bg-sp-orange-soft text-sp-orange-ink' : 'bg-white text-sp-ink-2'
      }`}
    >
      {label} ↗
    </a>
  );
}
