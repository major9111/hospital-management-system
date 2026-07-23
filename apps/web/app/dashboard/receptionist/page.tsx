import { cookies } from 'next/headers';
import { CalendarClock, Bot } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
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

      <Card padded={false} className="mb-6">
        <CardHeader title="Today's schedule" icon={CalendarClock} />
        {appointments.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Nothing booked yet" description="Appointments booked by staff or the AI receptionist will appear here." />
        ) : (
          <ul className="divide-y divide-hairline">
            {appointments.map((a: any) => (
              <li key={a.id} className="px-5 py-3 text-sm flex justify-between items-center">
                <span>{a.patientName} — {a.department} — {a.scheduledAt}</span>
                {a.bookedVia === 'ai_receptionist' && (
                  <Badge tone="clinical"><Bot className="w-3 h-3" /> AI receptionist</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BookAppointmentForm />
        <PatientSearchForm />
        <CreateInvoiceForm />
      </div>
    </div>
  );
}
