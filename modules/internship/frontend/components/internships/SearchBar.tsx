'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { buildInternshipsHref } from '@/lib/internshipFilters';
import type { InternshipFilterParams } from '@/lib/internshipFilters';
import type { PaginatedInternships } from '@/lib/types';
import { modeLabel } from '@/lib/mode';

const MIN_QUERY_LENGTH = 2;
const SUGGESTION_DEBOUNCE_MS = 250;

// A "What" + "Where" pair, not a single free-text box — `location` is a
// real, working filter server-side (see QueryInternshipsDto/findPublished)
// but had no UI control at all until this changed, so a search like "paid
// HR internships in Bangalore" had no way to actually filter by city; the
// role/skill box alone never matched a location.
export function SearchBar({ currentParams }: { currentParams: InternshipFilterParams }) {
  const router = useRouter();
  const [q, setQ] = useState(currentParams.q ?? '');
  const [location, setLocation] = useState(currentParams.location ?? '');
  const [suggestions, setSuggestions] = useState<PaginatedInternships['items']>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // `sort=newest` forces the paginated (LIMIT-bound) query path server-side
  // rather than the relevance-ranked one, which scores the full match set in
  // memory with no limit — the difference between a cheap per-keystroke call
  // and an unbounded scan. Suggestion order doesn't need relevance ranking
  // anyway; it's just "does this match, and what could I jump straight to."
  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const result = await apiFetch<PaginatedInternships>(
          `/internships?q=${encodeURIComponent(trimmed)}&pageSize=5&sort=newest`,
          { signal: controller.signal },
        );
        setSuggestions(result.items);
        setSuggestionsOpen(true);
        setActiveIndex(-1);
      } catch {
        // A superseded request aborts and rejects — silently drop it rather
        // than flashing an error for what's just a stale keystroke.
      }
    }, SUGGESTION_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSuggestionsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const goToInternship = (id: string) => {
    setSuggestionsOpen(false);
    router.push(`/internships/${id}`);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestionsOpen && activeIndex >= 0 && suggestions[activeIndex]) {
      goToInternship(suggestions[activeIndex].id);
      return;
    }
    setSuggestionsOpen(false);
    router.push(
      buildInternshipsHref(currentParams, { q: q || undefined, location: location || undefined }),
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestionsOpen || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Escape') {
      setSuggestionsOpen(false);
    }
  };

  const listboxId = 'search-suggestions';
  const showDropdown = suggestionsOpen && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <form
        onSubmit={submit}
        className="flex flex-col gap-1 rounded-sp-lg border border-black/10 bg-sp-bg-elev p-1.5 shadow-sm shadow-black/5 transition-shadow focus-within:border-sp-orange focus-within:shadow-[0_0_0_4px_var(--color-sp-orange-soft)] sm:flex-row sm:items-stretch sm:gap-0"
      >
        <div className="flex flex-1 items-center gap-2.5 px-3 py-2">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="shrink-0 text-sp-ink-3"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) setSuggestionsOpen(true);
            }}
            placeholder="Role, skill, or company…"
            aria-label="Role, skill, or company"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={listboxId}
            aria-autocomplete="list"
            autoComplete="off"
            className="w-full bg-transparent text-[15px] text-sp-navy placeholder:text-sp-ink-3 focus:outline-none"
          />
        </div>

        <div className="hidden w-px shrink-0 bg-black/10 sm:block" />

        <div className="flex flex-1 items-center gap-2.5 border-t border-black/10 px-3 py-2 sm:border-t-0">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="shrink-0 text-sp-ink-3"
          >
            <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z" />
            <circle cx="12" cy="9.5" r="2.3" />
          </svg>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, e.g. Bengaluru"
            aria-label="Location"
            className="w-full bg-transparent text-[15px] text-sp-navy placeholder:text-sp-ink-3 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="m-1 shrink-0 rounded-full bg-sp-orange px-5 py-2 text-sm font-bold text-white hover:bg-[#e2620f]"
        >
          Search
        </button>
      </form>

      {showDropdown && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-sp-lg border border-black/10 bg-sp-bg-elev shadow-lg shadow-black/10"
        >
          {suggestions.map((internship, index) => {
            const orgName = internship.employer?.organizationName ?? 'Organization';
            return (
              <li key={internship.id} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => goToInternship(internship.id)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full flex-col gap-0.5 border-b border-black/5 px-4 py-2.5 text-left last:border-b-0 ${
                    index === activeIndex ? 'bg-sp-bg-sunken' : 'hover:bg-sp-bg-sunken'
                  }`}
                >
                  <span className="truncate text-sm font-bold text-sp-navy">{internship.title}</span>
                  <span className="truncate text-xs font-semibold text-sp-ink-3">
                    {orgName}
                    {internship.location ? ` · ${internship.location}` : ` · ${modeLabel(internship.mode)}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
