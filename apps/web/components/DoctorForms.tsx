'use client';

import { useState } from 'react';
import { authFetch } from '@/lib/api';
import { StatusBanner } from '@/components/StatusBanner';

type Status = { kind: 'success' | 'error'; message: string } | null;

export function PrescriptionForm() {
  const [patientId, setPatientId] = useState('');
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<Status>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
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
    }
  }

  return (
    <form onSubmit={submit} className="border border-hairline bg-white rounded-sm p-5 space-y-3">
      <h3 className="font-display text-lg font-semibold text-ink">New prescription</h3>
      <StatusBanner status={status} />
      <input placeholder="Patient ID" required value={patientId} onChange={(e) => setPatientId(e.target.value)}
        className="w-full border border-hairline px-3 py-2 rounded-sm text-sm" />
      <div className="grid grid-cols-2 gap-3">
        <input placeholder="Medication" required value={medicationName} onChange={(e) => setMedicationName(e.target.value)}
          className="border border-hairline px-3 py-2 rounded-sm text-sm" />
        <input placeholder="Dosage (e.g. 500mg)" required value={dosage} onChange={(e) => setDosage(e.target.value)}
          className="border border-hairline px-3 py-2 rounded-sm text-sm" />
        <input placeholder="Frequency (e.g. twice daily)" required value={frequency} onChange={(e) => setFrequency(e.target.value)}
          className="border border-hairline px-3 py-2 rounded-sm text-sm" />
        <input type="number" min={1} placeholder="Quantity" required value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="border border-hairline px-3 py-2 rounded-sm text-sm" />
      </div>
      <button className="bg-clinical hover:bg-clinical-dark text-white text-sm font-medium px-4 py-2 rounded-sm">
        Create prescription
      </button>
    </form>
  );
}

export function LabOrderForm() {
  const [patientId, setPatientId] = useState('');
  const [testName, setTestName] = useState('');
  const [priority, setPriority] = useState('routine');
  const [status, setStatus] = useState<Status>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    try {
      const data = await authFetch('/lab/orders', {
        method: 'POST',
        body: JSON.stringify({ patientId, testName, priority }),
      });
      setStatus({ kind: 'success', message: `Lab order created (id: ${data.id})` });
    } catch (err: any) {
      setStatus({ kind: 'error', message: err.message });
    }
  }

  return (
    <form onSubmit={submit} className="border border-hairline bg-white rounded-sm p-5 space-y-3">
      <h3 className="font-display text-lg font-semibold text-ink">Order a lab test</h3>
      <StatusBanner status={status} />
      <input placeholder="Patient ID" required value={patientId} onChange={(e) => setPatientId(e.target.value)}
        className="w-full border border-hairline px-3 py-2 rounded-sm text-sm" />
      <div className="grid grid-cols-2 gap-3">
        <input placeholder="Test name (e.g. Lipid Panel)" required value={testName} onChange={(e) => setTestName(e.target.value)}
          className="border border-hairline px-3 py-2 rounded-sm text-sm" />
        <select value={priority} onChange={(e) => setPriority(e.target.value)}
          className="border border-hairline px-3 py-2 rounded-sm text-sm bg-white">
          <option value="routine">Routine</option>
          <option value="urgent">Urgent</option>
          <option value="stat">Stat</option>
        </select>
      </div>
      <button className="bg-clinical hover:bg-clinical-dark text-white text-sm font-medium px-4 py-2 rounded-sm">
        Order test
      </button>
    </form>
  );
}

export function TelemedicineForm() {
  const [appointmentId, setAppointmentId] = useState('');
  const [status, setStatus] = useState<Status>(null);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setRoomUrl(null);
    try {
      const data = await authFetch('/telemedicine/sessions', {
        method: 'POST',
        body: JSON.stringify({ appointmentId }),
      });
      setRoomUrl(data.roomUrl);
      setStatus({ kind: 'success', message: 'Session ready.' });
    } catch (err: any) {
      setStatus({ kind: 'error', message: err.message });
    }
  }

  return (
    <form onSubmit={submit} className="border border-hairline bg-white rounded-sm p-5 space-y-3">
      <h3 className="font-display text-lg font-semibold text-ink">Start a telemedicine session</h3>
      <StatusBanner status={status} />
      <input placeholder="Appointment ID" required value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)}
        className="w-full border border-hairline px-3 py-2 rounded-sm text-sm" />
      <button className="bg-clinical hover:bg-clinical-dark text-white text-sm font-medium px-4 py-2 rounded-sm">
        Create / open session
      </button>
      {roomUrl && (
        <a href={roomUrl} target="_blank" rel="noreferrer" className="block text-sm text-clinical-dark underline">
          Join room →
        </a>
      )}
    </form>
  );
}
