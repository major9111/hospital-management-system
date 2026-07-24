import { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-clinical hover:bg-clinical-dark text-white shadow-card hover:shadow-elevated',
  secondary: 'bg-surface hover:bg-canvas text-ink border border-hairline',
  danger: 'bg-signal hover:opacity-90 text-white shadow-card',
};

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: Variant }) {
  return (
    <button
      className={`text-sm font-medium px-4 py-2.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
