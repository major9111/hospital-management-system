'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HeartPulse } from 'lucide-react';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { StatusBanner } from '@/components/StatusBanner';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', phone: '',
    insuranceProvider: '', insurancePolicyNumber: '',
  });
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const hospitalId = process.env.NEXT_PUBLIC_DEFAULT_HOSPITAL_ID ?? '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, hospitalId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Registration failed');
      setStatus({ kind: 'success', message: data.message ?? 'Registered — you can now sign in.' });
      setTimeout(() => router.push('/login'), 1500);
    } catch (err: any) {
      setStatus({ kind: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  const field = (key: keyof typeof form, label: string, type = 'text', required = true) => (
    <Field
      label={label}
      type={type}
      required={required}
      value={form[key]}
      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
    />
  );

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12 bg-canvas">
      <div className="w-full max-w-md">
        <div className="bg-surface rounded-2xl shadow-elevated border border-hairline/60 p-8">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-xl bg-clinical-gradient flex items-center justify-center">
              <HeartPulse className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <p className="font-display text-sm font-semibold text-ink tracking-tight">Hospital Network</p>
          </div>

          <h1 className="font-display text-2xl font-semibold text-ink tracking-tight mb-1">Register as a patient</h1>
          <p className="text-sm text-ink-muted mb-6">Takes about a minute.</p>

          <StatusBanner status={status} />

          <form onSubmit={handleSubmit} className="space-y-4">
            {field('fullName', 'Full name')}
            {field('email', 'Email', 'email')}
            {field('password', 'Password', 'password')}
            {field('phone', 'Phone', 'tel', false)}
            <div className="pt-2 pb-1">
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Insurance (optional)</p>
            </div>
            {field('insuranceProvider', 'Insurance provider', 'text', false)}
            {field('insurancePolicyNumber', 'Policy number', 'text', false)}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Registering…' : 'Register'}
            </Button>
          </form>
        </div>

        <p className="text-sm text-ink-muted mt-6 text-center">
          Already have an account?{' '}
          <a href="/login" className="text-clinical-dark font-semibold">Sign in</a>
        </p>
      </div>
    </main>
  );
}
