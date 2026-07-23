import { Role } from '@hospital/shared-types';

export interface DecodedSession {
  userId: string;
  hospitalId: string;
  roles: Role[];
  email: string;
}

/**
 * Access tokens are short-lived (15 min) and only carry non-sensitive
 * routing info (roles, hospitalId) — safe to decode client-side for UI
 * branching. The gateway re-validates the signature on every real request,
 * so this decode is for navigation/display only, never an authorization
 * decision by itself.
 */
export function decodeSession(accessToken: string): DecodedSession | null {
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    return {
      userId: payload.sub,
      hospitalId: payload.hospitalId,
      roles: payload.roles,
      email: payload.email,
    };
  } catch {
    return null;
  }
}

export function primaryDashboardPath(roles: Role[]): string {
  if (roles.includes(Role.ADMIN)) return '/dashboard/admin';
  if (roles.includes(Role.DOCTOR)) return '/dashboard/doctor';
  if (roles.includes(Role.NURSE)) return '/dashboard/nurse';
  if (roles.includes(Role.RECEPTIONIST)) return '/dashboard/receptionist';
  return '/dashboard/patient';
}
