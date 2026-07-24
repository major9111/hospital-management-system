'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HeartPulse } from 'lucide-react';
import { decodeSession, primaryDashboardPath } from '@/lib/auth';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { StatusBanner } from '@/components/StatusBanner';
import { PulseLine } from '@/components/PulseLine';

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
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* Signature panel — gradient + animated pulse line, hidden on small screens */}
      <div className="hidden lg:flex flex-col justify-between bg-clinical-gradient p-12 text-white relative overflow-hidden">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            <HeartPulse className="w-4.5 h-4.5" strokeWidth={2.5} />
          </div>
          <p className="font-display text-lg font-semibold tracking-tight">Hospital Network</p>
        </div>

        <div>
          <div className="mb-8 opacity-90">
            <PulseLine />
          </div>
          <h2 className="font-display text-3xl font-semibold tracking-tight leading-tight mb-3">
            One console for every role in the network.
          </h2>
          <p className="text-white/80 text-sm max-w-sm">
            Admin, clinical, front desk, and patient — the same real-time
            record, scoped to what each person needs to see.
          </p>
        </div>

        <p className="text-xs text-white/50">Zamfara General Hospital — demo environment</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 rounded-xl bg-clinical-gradient flex items-center justify-center">
              <HeartPulse className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <p className="font-display text-sm font-semibold text-ink tracking-tight">Hospital Network</p>
          </div>

          <h1 className="font-display text-2xl font-semibold text-ink tracking-tight mb-1">Welcome back</h1>
          <p className="text-sm text-ink-muted mb-8">Sign in to your console.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Work email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Field label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />

            <StatusBanner status={status} />

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="text-sm text-ink-muted mt-6">
            New patient?{' '}
            <a href="/register" className="text-clinical-dark font-semibold">Register here</a>
          </p>
        </div>
      </div>
    </main>
  );
}
