import { cookies } from 'next/headers';
import { CalendarClock, Bot } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
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

      <Card padded={false} className="mb-8">
        <CardHeader title="Appointments" icon={CalendarClock} />
        {appointments.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No appointments yet"
            description="Booked visits assigned to you will show up here — from front desk, self-service, or the AI receptionist."
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {appointments.map((a: any) => (
              <li key={a.id} className="px-5 py-3 text-sm flex justify-between items-center">
                <span>{a.patientName} — {a.scheduledAt}</span>
                {a.bookedVia === 'ai_receptionist' && (
                  <Badge tone="clinical"><Bot className="w-3 h-3" /> AI receptionist</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PrescriptionForm />
        <LabOrderForm />
        <TelemedicineForm />
      </div>
    </div>
  );
}
