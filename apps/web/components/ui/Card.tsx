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
    <div className={`border border-hairline bg-white rounded-md ${padded ? 'p-5' : ''} ${className}`}>
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
    <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-hairline">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-clinical" />}
        <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
      </div>
      {action}
    </div>
  );
}
