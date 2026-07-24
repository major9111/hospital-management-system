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
    <nav className="w-64 shrink-0 bg-surface min-h-screen px-4 py-6 border-r border-hairline/60">
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <div className="w-8 h-8 rounded-xl bg-clinical-gradient flex items-center justify-center shadow-card">
          <HeartPulse className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <p className="font-display text-sm font-semibold text-ink tracking-tight">
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
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-clinical text-white shadow-card'
                    : 'text-ink-muted hover:text-ink hover:bg-canvas'
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
