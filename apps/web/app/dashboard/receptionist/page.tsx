import { cookies } from 'next/headers';
import { BookAppointmentForm, PatientSearchForm, CreateInvoiceForm } from '@/components/ReceptionistForms';

async function getAppointments() {
  const token = cookies().get('access_token')?.value;
  if (!token) return [];
  const res = await fetch(`${process.env.GATEWAY_INTERNAL_URL}/ehr/appointments`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.appointments ?? [];
}

export default async function ReceptionistDashboard() {
  const appointments = await getAppointments();

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink mb-1">Front desk</h1>
      <p className="text-ink-muted text-sm mb-8">Book, search, and invoice.</p>

      <div className="border border-hairline bg-white rounded-sm mb-6">
        <h2 className="font-display text-lg font-semibold text-ink px-5 pt-4 pb-2">Today's schedule</h2>
        {appointments.length ? (
          <ul className="divide-y divide-hairline">
            {appointments.map((a: any) => (
              <li key={a.id} className="px-5 py-3 text-sm flex justify-between items-center">
                <span>{a.patientName} — {a.department} — {a.scheduledAt}</span>
                {a.bookedVia === 'ai_receptionist' && (
                  <span className="font-mono text-xs text-ink-muted">via AI receptionist</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted px-5 pb-4">No appointments yet.</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BookAppointmentForm />
        <PatientSearchForm />
        <CreateInvoiceForm />
      </div>
    </div>
  );
}
