import { cookies } from 'next/headers';
import { PrescriptionForm, LabOrderForm, TelemedicineForm } from '@/components/DoctorForms';

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

export default async function DoctorDashboard() {
  const appointments = await getAppointments();

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink mb-1">Today's patients</h1>
      <p className="text-ink-muted text-sm mb-8">Your assigned appointments only.</p>

      {appointments.length === 0 ? (
        <p className="text-sm text-ink-muted border border-hairline bg-white rounded-sm px-5 py-6 mb-8">
          No appointments to show yet.
        </p>
      ) : (
        <ul className="divide-y divide-hairline border border-hairline bg-white rounded-sm mb-8">
          {appointments.map((a: any) => (
            <li key={a.id} className="px-5 py-3 text-sm">
              {a.patientName} — {a.scheduledAt}
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PrescriptionForm />
        <LabOrderForm />
        <TelemedicineForm />
      </div>
    </div>
  );
}
