import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Maps each dashboard section to the roles allowed in it. Admin can see
// every section; everyone else is confined to their own.
const ROUTE_ROLES: Record<string, string[]> = {
  '/dashboard/admin': ['admin'],
  '/dashboard/doctor': ['admin', 'doctor'],
  '/dashboard/nurse': ['admin', 'nurse'],
  '/dashboard/receptionist': ['admin', 'receptionist'],
  '/dashboard/patient': ['admin', 'patient'],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const section = Object.keys(ROUTE_ROLES).find((prefix) => pathname.startsWith(prefix));
  if (!section) return NextResponse.next();

  const token = req.cookies.get('access_token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    // NOTE: this only verifies the signature is well-formed for edge
    // routing purposes. The gateway is still the source of truth and
    // re-validates every API call — this middleware just avoids flashing
    // the wrong dashboard before a real request would 403 anyway.
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_ACCESS_SECRET),
    );
    const roles = (payload.roles as string[]) ?? [];
    const allowed = ROUTE_ROLES[section];
    if (!roles.some((r) => allowed.includes(r))) {
      return NextResponse.redirect(new URL('/dashboard/patient', req.url));
    }
  } catch {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
