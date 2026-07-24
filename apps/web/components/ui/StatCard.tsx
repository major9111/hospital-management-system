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
    <div className="bg-surface rounded-2xl shadow-card border border-hairline/60 px-5 py-4 flex items-start justify-between hover:shadow-elevated transition-shadow">
      <div>
        <p className="font-display text-2xl font-semibold text-ink tabular-nums tracking-tight">{value}</p>
        <p className="text-xs text-ink-muted mt-1 font-medium">{label}</p>
      </div>
      <div className="w-9 h-9 rounded-xl bg-clinical-light flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-clinical-dark" />
      </div>
    </div>
  );
}
