'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthUser } from './types';

const TOKEN_COOKIE = 'sp_token';
const USER_COOKIE = 'sp_user';

// Non-httpOnly cookies are fine here — this is an MVP behind a swappable OTP auth
// layer (see backend AuthService docs); real authorization is always re-checked by
// the backend guards, this cookie only drives client-side route gating/UX.
function setCookie(name: string, value: string, days = 7) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = getCookie(TOKEN_COOKIE);
    const storedUser = getCookie(USER_COOKIE);
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        clearCookie(TOKEN_COOKIE);
        clearCookie(USER_COOKIE);
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: AuthUser) => {
    setCookie(TOKEN_COOKIE, newToken);
    setCookie(USER_COOKIE, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    // Server Components (Header/Footer role-aware links, internship detail
    // ownership checks) read these cookies via next/headers and are cached
    // by the router — without this they'd keep showing the previous
    // session's role until a hard reload.
    router.refresh();
  };

  const logout = () => {
    clearCookie(TOKEN_COOKIE);
    clearCookie(USER_COOKIE);
    setToken(null);
    setUser(null);
    router.refresh();
  };

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
