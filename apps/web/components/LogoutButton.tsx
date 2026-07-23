'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  const router = useRouter();

  function handleLogout() {
    document.cookie = 'access_token=; path=/; max-age=0';
    router.push('/login');
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
    >
      <LogOut className="w-3.5 h-3.5" />
      Sign out
    </button>
  );
}
