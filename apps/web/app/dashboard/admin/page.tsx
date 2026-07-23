import { cookies } from 'next/headers';

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

  const stats = [
    { label: 'Active hospitals (network)', value: metrics?.activeHospitalsNetworkWide ?? '—' },
    { label: 'Staff accounts', value: metrics?.staffAccounts ?? '—' },
    { label: 'Patients', value: metrics?.patients ?? '—' },
    { label: "Appointments today", value: metrics?.appointmentsToday ?? '—' },
    { label: 'Low-stock items', value: metrics?.lowStockItems ?? '—' },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink mb-1">Network overview</h1>
      <p className="text-ink-muted text-sm mb-8">Your hospital branch, live from the database.</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="border border-hairline bg-white rounded-sm px-5 py-4">
            <p className="font-mono text-2xl text-ink">{stat.value}</p>
            <p className="text-xs text-ink-muted mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {!metrics && (
        <p className="text-sm text-ink-muted border border-hairline bg-white rounded-sm px-5 py-6 mt-6">
          Couldn't reach the metrics endpoint — check the gateway is running and
          <code className="font-mono"> GATEWAY_INTERNAL_URL</code> is set.
        </p>
      )}
    </div>
  );
}
