'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard/admin', label: 'Admin', roles: ['admin'] },
  { href: '/dashboard/doctor', label: 'Doctor', roles: ['admin', 'doctor'] },
  { href: '/dashboard/nurse', label: 'Nurse', roles: ['admin', 'nurse'] },
  { href: '/dashboard/receptionist', label: 'Front desk', roles: ['admin', 'receptionist'] },
  { href: '/dashboard/patient', label: 'Patient', roles: ['admin', 'patient'] },
];

export function Sidebar({ roles }: { roles: string[] }) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.some((r) => roles.includes(r)),
  );

  return (
    <nav className="w-56 shrink-0 border-r border-hairline bg-white/60 min-h-screen px-4 py-8">
      <p className="font-mono text-[11px] tracking-widest text-ink-muted uppercase mb-6 px-2">
        Hospital Network
      </p>
      <ul className="space-y-1">
        {visibleItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`block px-2 py-1.5 rounded-sm text-sm transition-colors ${
                pathname === item.href
                  ? 'bg-clinical-light text-clinical-dark font-medium'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
