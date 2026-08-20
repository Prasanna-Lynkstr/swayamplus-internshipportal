// Prepends https:// to a scheme-less URL (e.g. "linkedin.com/in/joe", which
// a resume-parser commonly extracts verbatim from plain-text PDF content
// with no protocol) before it's ever persisted. Without this, IsUrl()'s
// default require_protocol:false accepts the value as-is, and a browser
// treats a scheme-less href as relative to whatever page renders it —
// producing a same-site 404 instead of navigating to LinkedIn/GitHub.
// Used as a class-transformer @Transform, so it must tolerate non-string
// input (undefined/null pass through unchanged for @IsOptional fields).
export function normalizeUrl(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (trimmed === '') return trimmed;
  return /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
