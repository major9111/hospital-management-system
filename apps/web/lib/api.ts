'use client';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function authFetch(path: string, options: RequestInit = {}) {
  const token = getCookie('access_token');
  const res = await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message ?? `Request failed (${res.status})`);
  }
  return data;
}
