import { InputHTMLAttributes } from 'react';

export function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink-muted mb-1.5">{label}</label>
      <input
        {...props}
        className="w-full border border-hairline bg-surface px-3.5 py-2.5 rounded-xl text-sm text-ink placeholder:text-ink-muted/50 focus-visible:outline-clinical transition-colors"
      />
    </div>
  );
}
