// Mirrors the backend's normalizeUrl (see backend's
// common/utils/normalize-url.util.ts) — defensively fixes URLs saved before
// that normalization existed. A scheme-less value like "linkedin.com/in/joe"
// (what a resume-parser commonly extracts from plain-text PDF content)
// renders as a browser-relative href, landing on a same-site 404 instead of
// navigating to LinkedIn/GitHub.
export function normalizeExternalUrl(url: string): string {
  return /^[a-z][a-z\d+.-]*:\/\//i.test(url) ? url : `https://${url}`;
}
