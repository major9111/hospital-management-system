import { cookies } from 'next/headers';
import { Building2, Users, HeartPulse, CalendarCheck, PackageX } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';

async function getMetrics() {
  const token = cookies().get('access_token')?.value;
  if (!token) return null;
  const res = await fetch(`${process.env.GATEWAY_INTERNAL_URL}/admin/metrics`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function AdminDashboard() {
  const metrics = await getMetrics();

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink mb-1">Network overview</h1>
      <p className="text-ink-muted text-sm mb-8">Your hospital branch, live from the database.</p>

      {metrics ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard icon={Building2} label="Active hospitals (network)" value={metrics.activeHospitalsNetworkWide} />
          <StatCard icon={Users} label="Staff accounts" value={metrics.staffAccounts} />
          <StatCard icon={HeartPulse} label="Patients" value={metrics.patients} />
          <StatCard icon={CalendarCheck} label="Appointments today" value={metrics.appointmentsToday} />
          <StatCard icon={PackageX} label="Low-stock items" value={metrics.lowStockItems} />
        </div>
      ) : (
        <div className="border border-hairline bg-white rounded-2xl">
          <EmptyState
            icon={PackageX}
            title="Metrics unavailable right now"
            description="Couldn't reach the metrics endpoint. If this service just woke up from being idle, wait a moment and refresh — otherwise check that the gateway and its dependent services are running."
          />
        </div>
      )}
    </div>
  );
}
