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
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-sm bg-clinical flex items-center justify-center">
            <HeartPulse className="w-4.5 h-4.5 text-white" />
          </div>
          <p className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">
            Hospital Network Console
          </p>
        </div>
        <h1 className="font-display text-3xl font-semibold text-ink mb-8">Register as a patient</h1>

        <StatusBanner status={status} />

        <form onSubmit={handleSubmit} className="space-y-4">
          {field('fullName', 'Full name')}
          {field('email', 'Email', 'email')}
          {field('password', 'Password', 'password')}
          {field('phone', 'Phone', 'tel', false)}
          <p className="text-xs text-ink-muted pt-2">Insurance (optional)</p>
          {field('insuranceProvider', 'Insurance provider', 'text', false)}
          {field('insurancePolicyNumber', 'Policy number', 'text', false)}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Registering…' : 'Register'}
          </Button>
        </form>

        <p className="text-sm text-ink-muted mt-6">
          Already have an account?{' '}
          <a href="/login" className="text-clinical-dark font-medium">Sign in</a>
        </p>
      </div>
    </main>
  );
}
