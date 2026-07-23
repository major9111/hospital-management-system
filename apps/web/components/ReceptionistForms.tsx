'use client';

import { useState } from 'react';
import { authFetch } from '@/lib/api';
import { StatusBanner } from '@/components/StatusBanner';

type Status = { kind: 'success' | 'error'; message: string } | null;

export function BookAppointmentForm() {
  const [patientId, setPatientId] = useState('');
  const [department, setDepartment] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [status, setStatus] = useState<Status>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    try {
      const data = await authFetch('/ehr/appointments', {
        method: 'POST',
        body: JSON.stringify({ patientId, department, scheduledAt, bookedVia: 'staff' }),
      });
      setStatus({ kind: 'success', message: `Booked (id: ${data.id})` });
    } catch (err: any) {
      setStatus({ kind: 'error', message: err.message });
    }
  }

  return (
    <form onSubmit={submit} className="border border-hairline bg-white rounded-sm p-5 space-y-3">
      <h3 className="font-display text-lg font-semibold text-ink">Book appointment</h3>
      <StatusBanner status={status} />
      <input placeholder="Patient ID" required value={patientId} onChange={(e) => setPatientId(e.target.value)}
        className="w-full border border-hairline px-3 py-2 rounded-sm text-sm" />
      <div className="grid grid-cols-2 gap-3">
        <input placeholder="Department" required value={department} onChange={(e) => setDepartment(e.target.value)}
          className="border border-hairline px-3 py-2 rounded-sm text-sm" />
        <input type="datetime-local" required value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
          className="border border-hairline px-3 py-2 rounded-sm text-sm" />
      </div>
      <button className="bg-clinical hover:bg-clinical-dark text-white text-sm font-medium px-4 py-2 rounded-sm">
        Book
      </button>
    </form>
  );
}

export function PatientSearchForm() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [status, setStatus] = useState<Status>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    try {
      const data = await authFetch(`/ehr/search/patients?q=${encodeURIComponent(q)}`);
      setResults(data.results ?? []);
      if ((data.results ?? []).length === 0) setStatus({ kind: 'error', message: 'No matches.' });
    } catch (err: any) {
      setStatus({ kind: 'error', message: err.message });
    }
  }

  return (
    <div className="border border-hairline bg-white rounded-sm p-5 space-y-3">
      <h3 className="font-display text-lg font-semibold text-ink">Find a patient</h3>
      <StatusBanner status={status} />
      <form onSubmit={submit} className="flex gap-2">
        <input placeholder="Name" value={q} onChange={(e) => setQ(e.target.value)}
          className="flex-1 border border-hairline px-3 py-2 rounded-sm text-sm" />
        <button className="bg-clinical hover:bg-clinical-dark text-white text-sm font-medium px-4 py-2 rounded-sm">
          Search
        </button>
      </form>
      {results.length > 0 && (
        <ul className="divide-y divide-hairline border-t border-hairline pt-2">
          {results.map((r) => (
            <li key={r.id} className="py-2 text-sm flex justify-between">
              <span>{r.full_name}</span>
              <span className="font-mono text-xs text-ink-muted">{r.id}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CreateInvoiceForm() {
  const [patientId, setPatientId] = useState('');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [status, setStatus] = useState<Status>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
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
    }
  }

  return (
    <form onSubmit={submit} className="border border-hairline bg-white rounded-sm p-5 space-y-3">
      <h3 className="font-display text-lg font-semibold text-ink">Create invoice</h3>
      <StatusBanner status={status} />
      <input placeholder="Patient ID" required value={patientId} onChange={(e) => setPatientId(e.target.value)}
        className="w-full border border-hairline px-3 py-2 rounded-sm text-sm" />
      <div className="grid grid-cols-2 gap-3">
        <input placeholder="Description" required value={description} onChange={(e) => setDescription(e.target.value)}
          className="border border-hairline px-3 py-2 rounded-sm text-sm" />
        <input type="number" step="0.01" placeholder="Unit price" required value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          className="border border-hairline px-3 py-2 rounded-sm text-sm" />
      </div>
      <button className="bg-clinical hover:bg-clinical-dark text-white text-sm font-medium px-4 py-2 rounded-sm">
        Create invoice
      </button>
    </form>
  );
}
