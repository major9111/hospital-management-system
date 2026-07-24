const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  doctor: 'Doctor',
  nurse: 'Nurse',
  receptionist: 'Front desk',
  patient: 'Patient',
};

export function RoleBadge({ role }: { role: string }) {
  const label = ROLE_LABELS[role] ?? role;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-badge bg-clinical-light px-3 py-1.5 text-xs font-medium text-clinical-dark">
      <span className="h-1.5 w-1.5 rounded-full bg-clinical" aria-hidden />
      {label}
    </span>
  );
}
