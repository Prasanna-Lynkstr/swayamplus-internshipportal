const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// Deliberately duplicated (not imported) from lib/auth.tsx's cookie names: that
// module is 'use client', and this file is also called directly from Server
// Components, so importing from it would cross an RSC module boundary we don't
// need to cross for two constants.
function clearSessionCookies() {
  if (typeof document === 'undefined') return;
  document.cookie = 'sp_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  document.cookie = 'sp_user=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  token?: string | null;
}

export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, token, headers, ...rest } = options;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    cache: 'no-store',
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    // A 401 on a request that *included* a bearer token means the session
    // itself is invalid (expired JWT, or a token whose user no longer exists —
    // e.g. after a dev database reset) rather than a normal auth failure like
    // a wrong OTP (those calls never carry a token to begin with). Refreshing
    // the page can't fix a bad session, so don't show that as a generic
    // "could not load" error — clear it and send the user back to log in.
    if (res.status === 401 && token && typeof window !== 'undefined') {
      clearSessionCookies();
      window.location.href = '/?sessionExpired=1';
      return new Promise<T>(() => {});
    }

    const message = (data && (data.message || data.error)) || res.statusText;
    throw new ApiError(Array.isArray(message) ? message.join(', ') : message, res.status);
  }

  return data as T;
}
