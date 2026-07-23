'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { decodeSession, primaryDashboardPath } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setError('Those credentials did not match — check them and try again.');
        return;
      }
      const { accessToken } = await res.json();
      document.cookie = `access_token=${accessToken}; path=/; max-age=900; samesite=strict`;
      const session = decodeSession(accessToken);
      router.push(session ? primaryDashboardPath(session.roles) : '/dashboard/patient');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <p className="font-mono text-xs tracking-widest text-ink-muted uppercase mb-2">
            Hospital Network Console
          </p>
          <h1 className="font-display text-3xl font-semibold text-ink">Sign in</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm text-ink-muted mb-1">
              Work email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-hairline bg-white px-3 py-2 rounded-sm text-ink focus-visible:outline-clinical"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-ink-muted mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-hairline bg-white px-3 py-2 rounded-sm text-ink focus-visible:outline-clinical"
            />
          </div>

          {error && (
            <p className="text-sm text-signal bg-signal-light border border-signal/30 px-3 py-2 rounded-sm">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-clinical hover:bg-clinical-dark text-white font-medium py-2.5 rounded-sm transition-colors disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-sm text-ink-muted mt-6">
          New patient?{' '}
          <a href="/register" className="text-clinical-dark font-medium">Register here</a>
        </p>
      </div>
    </main>
  );
}
