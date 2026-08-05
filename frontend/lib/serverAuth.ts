import { cookies } from 'next/headers';
import type { AuthUser } from './types';

// Server Component counterpart to lib/auth.tsx's client AuthProvider — reads the
// same readable sp_user cookie so Server Components can route logged-in users
// correctly (e.g. sending an already-registered employer to their dashboard
// instead of back through /register/employer). Still UX-only: the backend
// guards are the real authorization boundary regardless of what this returns.
export async function getServerAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get('sp_user')?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

// Same non-httpOnly cookie the client SDK reads (see lib/auth.tsx) — lets a
// Server Component make an authenticated fetch (e.g. "did this student
// already apply?") without a client-side round trip.
export async function getServerAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('sp_token')?.value ?? null;
}
