'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Stethoscope, HeartPulse, ClipboardList, UserCircle } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard/admin', label: 'Admin', roles: ['admin'], icon: LayoutDashboard },
  { href: '/dashboard/doctor', label: 'Doctor', roles: ['admin', 'doctor'], icon: Stethoscope },
  { href: '/dashboard/nurse', label: 'Nurse', roles: ['admin', 'nurse'], icon: HeartPulse },
  { href: '/dashboard/receptionist', label: 'Front desk', roles: ['admin', 'receptionist'], icon: ClipboardList },
  { href: '/dashboard/patient', label: 'Patient', roles: ['admin', 'patient'], icon: UserCircle },
];

export function Sidebar({ roles }: { roles: string[] }) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.some((r) => roles.includes(r)),
  );

  return (
    <nav className="w-56 shrink-0 border-r border-hairline bg-white/60 min-h-screen px-4 py-8">
      <div className="flex items-center gap-2 px-2 mb-8">
        <div className="w-6 h-6 rounded-sm bg-clinical flex items-center justify-center">
          <HeartPulse className="w-3.5 h-3.5 text-white" />
        </div>
        <p className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">
          Hospital Network
        </p>
      </div>
      <ul className="space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm transition-colors ${
                  active
                    ? 'bg-clinical-light text-clinical-dark font-medium'
                    : 'text-ink-muted hover:text-ink hover:bg-paper'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
