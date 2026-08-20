import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

// Backend's helmet() gives the JSON API a full header set, but that never
// reached the pages themselves — a browser rendering /login or an apply
// form saw none of it (no CSP, no frame-ancestors), a real clickjacking gap
// on the surfaces that actually matter. Config-level CSP (not the
// nonce/proxy-based approach — see node_modules/next/dist/docs/01-app/
// 02-guides/content-security-policy.md) since nonces force every page into
// dynamic rendering app-wide just to close this gap; 'unsafe-inline' is the
// same tradeoff Next's own docs accept for this simpler path, needed
// because Next injects its own inline hydration scripts/styles.
// connect-src needs the dev backend's separate origin/port in development
// only — production proxies /api/v1 under the same origin (nginx), so
// 'self' alone covers it there.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''};
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  font-src 'self' data:;
  connect-src 'self'${isDev ? ' http://localhost:4000' : ''};
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, ' ')
  .trim();

const securityHeaders = [
  { key: 'Content-Security-Policy', value: cspHeader },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: 'http', hostname: 'localhost' }],
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
