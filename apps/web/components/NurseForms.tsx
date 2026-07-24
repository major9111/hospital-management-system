'use client';

import { useState } from 'react';
import { PillBottle, ClipboardCheck } from 'lucide-react';
import { authFetch } from '@/lib/api';
import { StatusBanner } from '@/components/StatusBanner';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';

type Status = { kind: 'success' | 'error'; message: string } | null;

export function FulfillPrescriptionForm() {
  const [itemId, setItemId] = useState('');
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card padded={false}>
      <CardHeader title="Fulfill prescription item" icon={PillBottle} />
      <form onSubmit={submit} className="p-5 space-y-3">
        <StatusBanner status={status} />
        <Field label="Prescription item ID" required value={itemId} onChange={(e) => setItemId(e.target.value)} />
        <Button type="submit" disabled={loading}>{loading ? 'Dispensing…' : 'Mark dispensed'}</Button>
      </form>
    </Card>
  );
}

export function ReportLabResultForm() {
  const [orderId, setOrderId] = useState('');
  const [summary, setSummary] = useState('');
  const [isAbnormal, setIsAbnormal] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      await authFetch(`/lab/orders/${orderId}/results`, {
        method: 'POST',
        body: JSON.stringify({ resultSummary: summary, isAbnormal }),
      });
      setStatus({ kind: 'success', message: 'Result recorded — order marked completed.' });
    } catch (err: any) {
      setStatus({ kind: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card padded={false}>
      <CardHeader title="Report lab result" icon={ClipboardCheck} />
      <form onSubmit={submit} className="p-5 space-y-3">
        <StatusBanner status={status} />
        <Field label="Lab order ID" required value={orderId} onChange={(e) => setOrderId(e.target.value)} />
        <div>
          <label className="block text-xs text-ink-muted mb-1">Result summary</label>
          <textarea
            required value={summary} onChange={(e) => setSummary(e.target.value)} rows={3}
            className="w-full border border-hairline px-3 py-2 rounded-xl text-sm focus-visible:outline-clinical"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input type="checkbox" checked={isAbnormal} onChange={(e) => setIsAbnormal(e.target.checked)} />
          Flag as abnormal
        </label>
        <Button type="submit" disabled={loading}>{loading ? 'Submitting…' : 'Submit result'}</Button>
      </form>
    </Card>
  );
}
