'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const NAV_LINKS = [{ href: '/internships', label: 'Internships' }];

export function NavPill() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <div className="sp-nav-pill mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 rounded-full px-3 py-2 text-white shadow-md shadow-green-950/10">
      <div className="flex items-center gap-1 pl-2">
        {NAV_LINKS.map((link) => {
          // A signed-in candidate/employer clicking "Internships" means
          // "take me back to my dashboard," not "show me the marketing hub
          // again" — that hub's whole job is routing a *new* visitor to the
          // right landing page, which a returning signed-in user has
          // already been through.
          const href =
            user?.role === 'employer'
              ? '/employer/dashboard'
              : user?.role === 'student'
                ? '/student/dashboard'
                : link.href;
          // Active-highlight still tracks the internships *area* of the
          // site (hub/browse/detail), independent of where a signed-in
          // user's click actually lands — the label still says
          // "Internships," so it shouldn't light up while sitting on
          // /employer/dashboard.
          const isActive = pathname.startsWith('/internships');
          return (
            <Link
              key={link.href}
              href={href}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/15 ${
                isActive ? 'bg-white/20' : ''
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {user ? (
          <>
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
          </>
        ) : (
          <Link href="/login" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-sp-green-from hover:bg-white/90">
            Login
          </Link>
        )}
      </div>
    </div>
  );
}
