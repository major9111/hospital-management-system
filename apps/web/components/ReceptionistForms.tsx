'use client';

import { useState } from 'react';
import { CalendarPlus, Search, Receipt } from 'lucide-react';
import { authFetch } from '@/lib/api';
import { StatusBanner } from '@/components/StatusBanner';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';

type Status = { kind: 'success' | 'error'; message: string } | null;

export function BookAppointmentForm() {
  const [patientId, setPatientId] = useState('');
  const [department, setDepartment] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const data = await authFetch('/ehr/appointments', {
        method: 'POST',
        body: JSON.stringify({ patientId, department, scheduledAt, bookedVia: 'staff' }),
      });
      setStatus({ kind: 'success', message: `Booked (id: ${data.id})` });
    } catch (err: any) {
      setStatus({ kind: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card padded={false}>
      <CardHeader title="Book appointment" icon={CalendarPlus} />
      <form onSubmit={submit} className="p-5 space-y-3">
        <StatusBanner status={status} />
        <Field label="Patient ID" required value={patientId} onChange={(e) => setPatientId(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Department" required value={department} onChange={(e) => setDepartment(e.target.value)} />
          <Field label="Date & time" type="datetime-local" required value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading}>{loading ? 'Booking…' : 'Book'}</Button>
      </form>
    </Card>
  );
}

export function PatientSearchForm() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[] | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const data = await authFetch(`/ehr/search/patients?q=${encodeURIComponent(q)}`);
      setResults(data.results ?? []);
    } catch (err: any) {
      setStatus({ kind: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card padded={false}>
      <CardHeader title="Find a patient" icon={Search} />
      <div className="p-5 space-y-3">
        <StatusBanner status={status} />
        <form onSubmit={submit} className="flex gap-2 items-end">
          <div className="flex-1">
            <Field label="Name" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading}>{loading ? '…' : 'Search'}</Button>
        </form>
        {results !== null && (
          results.length === 0 ? (
            <EmptyState icon={Search} title="No matches" description="Try a different spelling, or check with the patient directly." />
          ) : (
            <ul className="divide-y divide-hairline border-t border-hairline pt-2">
              {results.map((r) => (
                <li key={r.id} className="py-2 text-sm flex justify-between">
                  <span>{r.full_name}</span>
                  <span className="font-mono text-xs text-ink-muted">{r.id}</span>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </Card>
  );
}

export function CreateInvoiceForm() {
  const [patientId, setPatientId] = useState('');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const data = await authFetch('/billing/invoices', {
        method: 'POST',
        body: JSON.stringify({
          patientId,
          items: [{ description, quantity: 1, unitPrice: Number(unitPrice) }],
        }),
      });
      setStatus({ kind: 'success', message: `Invoice created — total ${data.totalAmount}` });
    } catch (err: any) {
      setStatus({ kind: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card padded={false}>
      <CardHeader title="Create invoice" icon={Receipt} />
      <form onSubmit={submit} className="p-5 space-y-3">
        <StatusBanner status={status} />
        <Field label="Patient ID" required value={patientId} onChange={(e) => setPatientId(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Description" required value={description} onChange={(e) => setDescription(e.target.value)} />
          <Field label="Unit price" type="number" step="0.01" required value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create invoice'}</Button>
      </form>
    </Card>
  );
}
