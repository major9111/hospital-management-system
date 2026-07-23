const ROLE_LABELS: Record<string, string> = {
  admin: 'ADMIN',
  doctor: 'DR',
  nurse: 'RN',
  receptionist: 'FRONT DESK',
  patient: 'PATIENT',
};

export function RoleBadge({ role }: { role: string }) {
  const label = ROLE_LABELS[role] ?? role.toUpperCase();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-badge border border-hairline bg-white px-3 py-1 font-mono text-xs tracking-wide text-ink">
      <span className="h-1.5 w-1.5 rounded-full bg-clinical" aria-hidden />
      {label}
    </span>
  );
}
