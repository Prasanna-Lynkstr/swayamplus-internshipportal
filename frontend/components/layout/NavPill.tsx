'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/internships', label: 'Internships' },
  { href: '/#about', label: 'About' },
];

export function NavPill() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [query, setQuery] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(query ? `/internships?q=${encodeURIComponent(query)}` : '/internships');
  };

  return (
    <div className="sp-nav-pill mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 rounded-full px-3 py-2 text-white shadow-md shadow-green-950/10">
      <div className="flex items-center gap-1 pl-2">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/15 ${
              pathname === link.href ? 'bg-white/20' : ''
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <form onSubmit={handleSearch} className="ml-auto min-w-[160px] flex-1">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search internships"
          aria-label="Search internships"
          className="w-full rounded-full bg-black/15 px-4 py-2 text-sm text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/40"
        />
      </form>

      <button
        type="button"
        className="rounded-full bg-white/15 px-3 py-2 text-xs font-bold"
        aria-label="Language: English"
      >
        EN
      </button>

      <button
        type="button"
        onClick={() => setDarkMode((d) => !d)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"
        aria-label="Toggle dark mode"
        title="Dark mode toggle is cosmetic in this MVP"
      >
        {darkMode ? '☀' : '☽'}
      </button>

      {user ? (
        <div className="flex items-center gap-2">
          <Link
            href={
              user.role === 'employer'
                ? '/employer/dashboard'
                : user.role === 'admin'
                  ? '/admin/dashboard'
                  : '/student/dashboard'
            }
            className="rounded-full px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/15"
          >
            {user.role === 'admin' ? 'Admin' : 'Dashboard'}
          </Link>
          <Link
            href={
              user.role === 'employer'
                ? '/employer/dashboard'
                : user.role === 'admin'
                  ? '/admin/dashboard'
                  : '/student/dashboard'
            }
            className="flex h-9 w-9 items-center justify-center rounded-full bg-sp-orange text-sm font-bold text-white"
            title={user.identifier}
          >
            {user.identifier.charAt(0).toUpperCase()}
          </Link>
          <button
            type="button"
            onClick={() => {
              logout();
              router.push('/');
            }}
            className="rounded-full px-3 py-2 text-xs font-semibold hover:bg-white/15"
          >
            Log out
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <Link
            href="/register/student"
            className="rounded-full bg-white/15 px-3 py-2 text-xs font-bold hover:bg-white/25"
          >
            Student login
          </Link>
          <Link
            href="/register/employer"
            className="rounded-full bg-white px-3 py-2 text-xs font-bold text-sp-green-from hover:bg-white/90"
          >
            Employer login
          </Link>
        </div>
      )}
    </div>
  );
}
