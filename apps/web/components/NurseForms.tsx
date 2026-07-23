'use client';

import { useState } from 'react';
import { authFetch } from '@/lib/api';
import { StatusBanner } from '@/components/StatusBanner';

type Status = { kind: 'success' | 'error'; message: string } | null;

export function FulfillPrescriptionForm() {
  const [itemId, setItemId] = useState('');
  const [status, setStatus] = useState<Status>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    try {
      const data = await authFetch(`/prescriptions/items/${itemId}/fulfill`, { method: 'POST' });
      setStatus({
        kind: 'success',
        message: `Fulfilled — prescription now ${data.prescriptionStatus}${
          data.inventoryAdjustment?.newQuantity !== undefined
            ? `, stock now ${data.inventoryAdjustment.newQuantity}`
            : ''
        }`,
      });
    } catch (err: any) {
      setStatus({ kind: 'error', message: err.message });
    }
  }

  return (
    <form onSubmit={submit} className="border border-hairline bg-white rounded-sm p-5 space-y-3">
      <h3 className="font-display text-lg font-semibold text-ink">Fulfill prescription item</h3>
      <StatusBanner status={status} />
      <input placeholder="Prescription item ID" required value={itemId} onChange={(e) => setItemId(e.target.value)}
        className="w-full border border-hairline px-3 py-2 rounded-sm text-sm" />
      <button className="bg-clinical hover:bg-clinical-dark text-white text-sm font-medium px-4 py-2 rounded-sm">
        Mark dispensed
      </button>
    </form>
  );
}

export function ReportLabResultForm() {
  const [orderId, setOrderId] = useState('');
  const [summary, setSummary] = useState('');
  const [isAbnormal, setIsAbnormal] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    try {
      await authFetch(`/lab/orders/${orderId}/results`, {
        method: 'POST',
        body: JSON.stringify({ resultSummary: summary, isAbnormal }),
      });
      setStatus({ kind: 'success', message: 'Result recorded — order marked completed.' });
    } catch (err: any) {
      setStatus({ kind: 'error', message: err.message });
    }
  }

  return (
    <form onSubmit={submit} className="border border-hairline bg-white rounded-sm p-5 space-y-3">
      <h3 className="font-display text-lg font-semibold text-ink">Report lab result</h3>
      <StatusBanner status={status} />
      <input placeholder="Lab order ID" required value={orderId} onChange={(e) => setOrderId(e.target.value)}
        className="w-full border border-hairline px-3 py-2 rounded-sm text-sm" />
      <textarea placeholder="Result summary" required value={summary} onChange={(e) => setSummary(e.target.value)}
        rows={3} className="w-full border border-hairline px-3 py-2 rounded-sm text-sm" />
      <label className="flex items-center gap-2 text-sm text-ink-muted">
        <input type="checkbox" checked={isAbnormal} onChange={(e) => setIsAbnormal(e.target.checked)} />
        Flag as abnormal
      </label>
      <button className="bg-clinical hover:bg-clinical-dark text-white text-sm font-medium px-4 py-2 rounded-sm">
        Submit result
      </button>
    </form>
  );
}
