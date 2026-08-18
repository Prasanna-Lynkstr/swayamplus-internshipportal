import { NextRequest, NextResponse } from 'next/server';

// UX-only gating — decodes the readable sp_user cookie, does not verify the JWT.
// The backend's JwtAuthGuard/RolesGuard are the real authorization boundary.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userCookie = request.cookies.get('sp_user')?.value;
  let role: string | null = null;
  if (userCookie) {
    try {
      role = JSON.parse(userCookie).role ?? null;
    } catch {
      role = null;
    }
  }

  if (pathname.startsWith('/employer/') && role !== 'employer') {
    return NextResponse.redirect(new URL('/internships/employers', request.url));
  }

  if (
    (pathname.startsWith('/admin/employers') || pathname.startsWith('/admin/requests')) &&
    role !== 'admin'
  ) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  if (pathname.startsWith('/applications') && role !== 'student') {
    return NextResponse.redirect(new URL('/register/student', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/employer/:path*',
    '/admin/employers/:path*',
    '/admin/requests/:path*',
    '/applications/:path*',
  ],
};
