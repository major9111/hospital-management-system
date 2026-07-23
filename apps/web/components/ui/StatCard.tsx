export function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="border border-hairline bg-white rounded-md px-5 py-4 flex items-start justify-between">
      <div>
        <p className="font-mono text-2xl text-ink tabular-nums">{value}</p>
        <p className="text-xs text-ink-muted mt-1">{label}</p>
      </div>
      <Icon className="w-4 h-4 text-clinical mt-1" />
    </div>
  );
}
