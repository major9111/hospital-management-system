import { cookies } from 'next/headers';
import { ReceptionistChat } from '@/components/ReceptionistChat';

async function getJSON(path: string) {
  const token = cookies().get('access_token')?.value;
  if (!token) return null;
  const res = await fetch(`${process.env.GATEWAY_INTERNAL_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function PatientDashboard() {
  const appointments = await getJSON('/ehr/appointments');
  const myRecord = await getJSON('/ehr/patients/me');
  const prescriptions = myRecord ? await getJSON(`/prescriptions/patient/${myRecord.id}`) : null;
  const labOrders = myRecord ? await getJSON(`/lab/orders/patient/${myRecord.id}`) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink mb-1">Your care</h1>
        <p className="text-ink-muted text-sm">Appointments and records — visible only to you.</p>
      </div>

      <div className="border border-hairline bg-white rounded-sm">
        <h2 className="font-display text-lg font-semibold text-ink px-5 pt-4 pb-2">Appointments</h2>
        {appointments?.appointments?.length ? (
          <ul className="divide-y divide-hairline">
            {appointments.appointments.map((a: any) => (
              <li key={a.id} className="px-5 py-3 text-sm flex justify-between items-center">
                <span>{a.department} — {a.scheduledAt}</span>
                {a.bookedVia === 'ai_receptionist' && (
                  <span className="font-mono text-xs text-ink-muted">booked via AI receptionist</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted px-5 pb-4">No appointments yet.</p>
        )}
      </div>

      <div className="border border-hairline bg-white rounded-sm">
        <h2 className="font-display text-lg font-semibold text-ink px-5 pt-4 pb-2">Prescriptions</h2>
        {prescriptions?.prescriptions?.length ? (
          <ul className="divide-y divide-hairline">
            {prescriptions.prescriptions.map((p: any) => (
              <li key={p.id} className="px-5 py-3 text-sm flex justify-between items-center">
                <span>{p.notes || 'Prescription'}</span>
                <span className="font-mono text-xs text-ink-muted">{p.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted px-5 pb-4">
            {myRecord ? 'No prescriptions on file.' : 'No patient record linked to this account yet.'}
          </p>
        )}
      </div>

      <div className="border border-hairline bg-white rounded-sm">
        <h2 className="font-display text-lg font-semibold text-ink px-5 pt-4 pb-2">Lab results</h2>
        {labOrders?.labOrders?.length ? (
          <ul className="divide-y divide-hairline">
            {labOrders.labOrders.map((o: any) => (
              <li key={o.id} className="px-5 py-3 text-sm flex justify-between items-center">
                <span>{o.test_name}</span>
                <span className="font-mono text-xs text-ink-muted">{o.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted px-5 pb-4">
            {myRecord ? 'No lab orders on file.' : 'No patient record linked to this account yet.'}
          </p>
        )}
      </div>

      <ReceptionistChat />
    </div>
  );
}
