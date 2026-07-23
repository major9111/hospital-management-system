'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HeartPulse } from 'lucide-react';
import { decodeSession, primaryDashboardPath } from '@/lib/auth';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { StatusBanner } from '@/components/StatusBanner';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<{ kind: 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setStatus({ kind: 'error', message: 'Those credentials did not match — check them and try again.' });
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
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-sm bg-clinical flex items-center justify-center">
            <HeartPulse className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <p className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">
              Hospital Network Console
            </p>
          </div>
        </div>
        <h1 className="font-display text-3xl font-semibold text-ink mb-8">Sign in</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Work email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />

          <StatusBanner status={status} />

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="text-sm text-ink-muted mt-6">
          New patient?{' '}
          <a href="/register" className="text-clinical-dark font-medium">Register here</a>
        </p>
      </div>
    </main>
  );
}
