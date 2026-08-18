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
    // Always populated (defaults to a single-item array wrapping `message`)
    // so callers can render class-validator's multi-message responses (e.g.
    // 6 field errors on one failed submit) as a clean list instead of the
    // comma-joined run-on sentence `message` collapses them into — see
    // components/ui/FormError.tsx.
    public messages: string[] = [message],
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

    const rawMessage = (data && (data.message || data.error)) || res.statusText;
    const messages: string[] = Array.isArray(rawMessage) ? rawMessage : [rawMessage];
    throw new ApiError(messages.join(', '), res.status, messages);
  }

  return data as T;
}

// CSV export endpoints return text/csv, not JSON, so they can't go through
// apiFetch's JSON.parse — fetch the blob directly and trigger a browser
// download via a temporary object URL. Auth still needs the bearer header
// (a plain <a href> download wouldn't carry it, since only cookies
// auto-attach to a browser navigation).
export async function downloadCsv(path: string, token: string | null, filename: string): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new ApiError('Export failed. Please try again.', res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
