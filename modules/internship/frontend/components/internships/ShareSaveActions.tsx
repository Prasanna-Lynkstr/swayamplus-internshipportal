'use client';

import { useState } from 'react';
import { useSavedInternships } from '@/lib/useSavedInternships';

interface Props {
  internshipId: string;
  title: string;
  size?: 'sm' | 'md';
}

export function ShareSaveActions({ internshipId, title, size = 'sm' }: Props) {
  const { isSaved, toggle } = useSavedInternships();
  const [copied, setCopied] = useState(false);
  const saved = isSaved(internshipId);
  const dim = size === 'md' ? 'h-9 w-9 text-base' : 'h-8 w-8 text-sm';

  const share = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/internships/${internshipId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // user cancelled the native share sheet — nothing to do
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const toggleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(internshipId);
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={share}
        title={copied ? 'Link copied!' : 'Share'}
        className={`flex ${dim} items-center justify-center rounded-full text-sp-ink-3 hover:bg-black/5 hover:text-sp-navy`}
      >
        {copied ? '✓' : '↗'}
      </button>
      <button
        type="button"
        onClick={toggleSave}
        title={saved ? 'Remove from saved' : 'Save for later'}
        className={`flex ${dim} items-center justify-center rounded-full hover:bg-black/5 ${
          saved ? 'text-sp-orange' : 'text-sp-ink-3 hover:text-sp-navy'
        }`}
      >
        {saved ? '★' : '☆'}
      </button>
    </div>
  );
}
