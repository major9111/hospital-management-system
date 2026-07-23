import { cookies } from 'next/headers';
import { CalendarClock, Pill, FlaskConical, Bot } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink mb-1">Your care</h1>
          <p className="text-ink-muted text-sm">Appointments and records — visible only to you.</p>
        </div>

        <Card padded={false}>
          <CardHeader title="Appointments" icon={CalendarClock} />
          {appointments?.appointments?.length ? (
            <ul className="divide-y divide-hairline">
              {appointments.appointments.map((a: any) => (
                <li key={a.id} className="px-5 py-3 text-sm flex justify-between items-center">
                  <span>{a.department} — {a.scheduledAt}</span>
                  {a.bookedVia === 'ai_receptionist' && (
                    <Badge tone="clinical"><Bot className="w-3 h-3" /> AI receptionist</Badge>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={CalendarClock} title="No appointments yet" description="Use the AI receptionist to the right to book your first visit." />
          )}
        </Card>

        <Card padded={false}>
          <CardHeader title="Prescriptions" icon={Pill} />
          {prescriptions?.prescriptions?.length ? (
            <ul className="divide-y divide-hairline">
              {prescriptions.prescriptions.map((p: any) => (
                <li key={p.id} className="px-5 py-3 text-sm flex justify-between items-center">
                  <span>{p.notes || 'Prescription'}</span>
                  <Badge>{p.status}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Pill}
              title="Nothing on file"
              description={myRecord ? 'No prescriptions yet.' : 'No patient record is linked to this account yet — contact front desk.'}
            />
          )}
        </Card>

        <Card padded={false}>
          <CardHeader title="Lab results" icon={FlaskConical} />
          {labOrders?.labOrders?.length ? (
            <ul className="divide-y divide-hairline">
              {labOrders.labOrders.map((o: any) => (
                <li key={o.id} className="px-5 py-3 text-sm flex justify-between items-center">
                  <span>{o.test_name}</span>
                  <Badge>{o.status}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={FlaskConical}
              title="Nothing on file"
              description={myRecord ? 'No lab orders yet.' : 'No patient record is linked to this account yet — contact front desk.'}
            />
          )}
        </Card>
      </div>

      <div className="lg:col-span-1">
        <ReceptionistChat />
      </div>
    </div>
  );
}
