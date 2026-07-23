'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
    <div>
      <label className="block text-sm text-ink-muted mb-1">{label}</label>
      <input
        type={type}
        required={required}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full border border-hairline bg-white px-3 py-2 rounded-sm text-ink focus-visible:outline-clinical"
      />
    </div>
  );

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <p className="font-mono text-xs tracking-widest text-ink-muted uppercase mb-2">
          Hospital Network Console
        </p>
        <h1 className="font-display text-3xl font-semibold text-ink mb-8">Register as a patient</h1>

        {status && (
          <p
            className={`text-sm px-3 py-2 rounded-sm border mb-4 ${
              status.kind === 'error'
                ? 'text-signal bg-signal-light border-signal/30'
                : 'text-clinical-dark bg-clinical-light border-clinical/30'
            }`}
          >
            {status.message}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {field('fullName', 'Full name')}
          {field('email', 'Email', 'email')}
          {field('password', 'Password', 'password')}
          {field('phone', 'Phone', 'tel', false)}
          <p className="text-xs text-ink-muted pt-2">Insurance (optional)</p>
          {field('insuranceProvider', 'Insurance provider', 'text', false)}
          {field('insurancePolicyNumber', 'Policy number', 'text', false)}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-clinical hover:bg-clinical-dark text-white font-medium py-2.5 rounded-sm transition-colors disabled:opacity-60"
          >
            {loading ? 'Registering…' : 'Register'}
          </button>
        </form>

        <p className="text-sm text-ink-muted mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-clinical-dark font-medium">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
