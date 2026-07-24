import { ReactNode } from 'react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center px-5 py-12 gap-2">
      <div className="w-12 h-12 rounded-2xl bg-canvas flex items-center justify-center mb-1">
        <Icon className="w-5 h-5 text-ink-muted" />
      </div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="text-sm text-ink-muted max-w-sm">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
