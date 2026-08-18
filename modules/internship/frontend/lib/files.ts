const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const API_ORIGIN = API_URL.replace(/\/api(\/v1)?\/?$/, '');

/**
 * Uploaded file URLs are either a relative `/uploads/...` path (local disk driver)
 * or an absolute URL (Cloudflare R2 driver) — resolve either into something the
 * browser can fetch directly.
 */
export function resolveFileUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url}`;
}
