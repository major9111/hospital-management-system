'use client';

import { useState } from 'react';
import { Pill, FlaskConical, Video } from 'lucide-react';
import { authFetch } from '@/lib/api';
import { StatusBanner } from '@/components/StatusBanner';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';

type Status = { kind: 'success' | 'error'; message: string } | null;

export function PrescriptionForm() {
  const [patientId, setPatientId] = useState('');
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const data = await authFetch('/prescriptions', {
        method: 'POST',
        body: JSON.stringify({
          patientId,
          items: [{ medicationName, dosage, frequency, quantity }],
        }),
      });
      setStatus({ kind: 'success', message: `Prescription created (id: ${data.id})` });
    } catch (err: any) {
      setStatus({ kind: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card padded={false}>
      <CardHeader title="New prescription" icon={Pill} />
      <form onSubmit={submit} className="p-5 space-y-3">
        <StatusBanner status={status} />
        <Field label="Patient ID" required value={patientId} onChange={(e) => setPatientId(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Medication" required value={medicationName} onChange={(e) => setMedicationName(e.target.value)} />
          <Field label="Dosage" placeholder="500mg" required value={dosage} onChange={(e) => setDosage(e.target.value)} />
          <Field label="Frequency" placeholder="twice daily" required value={frequency} onChange={(e) => setFrequency(e.target.value)} />
          <Field label="Quantity" type="number" min={1} required value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
        </div>
        <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create prescription'}</Button>
      </form>
    </Card>
  );
}

export function LabOrderForm() {
  const [patientId, setPatientId] = useState('');
  const [testName, setTestName] = useState('');
  const [priority, setPriority] = useState('routine');
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const data = await authFetch('/lab/orders', {
        method: 'POST',
        body: JSON.stringify({ patientId, testName, priority }),
      });
      setStatus({ kind: 'success', message: `Lab order created (id: ${data.id})` });
    } catch (err: any) {
      setStatus({ kind: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card padded={false}>
      <CardHeader title="Order a lab test" icon={FlaskConical} />
      <form onSubmit={submit} className="p-5 space-y-3">
        <StatusBanner status={status} />
        <Field label="Patient ID" required value={patientId} onChange={(e) => setPatientId(e.target.value)} />
        <Field label="Test name" placeholder="Lipid Panel" required value={testName} onChange={(e) => setTestName(e.target.value)} />
        <div>
          <label className="block text-xs text-ink-muted mb-1">Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}
            className="w-full border border-hairline px-3 py-2 rounded-xl text-sm bg-white">
            <option value="routine">Routine</option>
            <option value="urgent">Urgent</option>
            <option value="stat">Stat</option>
          </select>
        </div>
        <Button type="submit" disabled={loading}>{loading ? 'Ordering…' : 'Order test'}</Button>
      </form>
    </Card>
  );
}

export function TelemedicineForm() {
  const [appointmentId, setAppointmentId] = useState('');
  const [status, setStatus] = useState<Status>(null);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setRoomUrl(null);
    setLoading(true);
    try {
      const data = await authFetch('/telemedicine/sessions', {
        method: 'POST',
        body: JSON.stringify({ appointmentId }),
      });
      setRoomUrl(data.roomUrl);
      setStatus({ kind: 'success', message: 'Session ready.' });
    } catch (err: any) {
      setStatus({ kind: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card padded={false}>
      <CardHeader title="Telemedicine" icon={Video} />
      <form onSubmit={submit} className="p-5 space-y-3">
        <StatusBanner status={status} />
        <Field label="Appointment ID" required value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)} />
        <Button type="submit" disabled={loading}>{loading ? 'Starting…' : 'Create / open session'}</Button>
        {roomUrl && (
          <a href={roomUrl} target="_blank" rel="noreferrer" className="block text-sm text-clinical-dark underline">
            Join room →
          </a>
        )}
      </form>
    </Card>
  );
}
