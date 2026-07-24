import { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div className={`bg-surface rounded-2xl shadow-card border border-hairline/60 ${padded ? 'p-5' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  icon: Icon,
  action,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-4">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div className="w-7 h-7 rounded-lg bg-clinical-light flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-clinical-dark" />
          </div>
        )}
        <h3 className="font-display text-[15px] font-semibold text-ink tracking-tight">{title}</h3>
      </div>
      {action}
    </div>
  );
}
