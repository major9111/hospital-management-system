import { InputHTMLAttributes } from 'react';

export function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div>
      <label className="block text-xs text-ink-muted mb-1">{label}</label>
      <input
        {...props}
        className="w-full border border-hairline bg-white px-3 py-2 rounded-sm text-sm text-ink focus-visible:outline-clinical"
      />
    </div>
  );
}
