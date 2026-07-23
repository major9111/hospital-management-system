import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { Sidebar } from '@/components/Sidebar';
import { RoleBadge } from '@/components/RoleBadge';
import { LogoutButton } from '@/components/LogoutButton';
import { InstallAppButton } from '@/components/InstallAppButton';

async function getSession() {
  const token = cookies().get('access_token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_ACCESS_SECRET),
    );
    return {
      email: payload.email as string,
      roles: (payload.roles as string[]) ?? [],
    };
  } catch {
    return null;
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const roles = session?.roles ?? ['patient'];
  // middleware.ts already redirects unauthenticated/unauthorized visitors —
  // this fallback just keeps the shell from crashing if it somehow renders first.

  return (
    <div className="flex">
      <Sidebar roles={roles} />
      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-hairline px-8 py-4">
          <p className="font-mono text-xs text-ink-muted">{session?.email ?? 'Not signed in'}</p>
          <div className="flex items-center gap-4">
            <InstallAppButton />
            <RoleBadge role={roles[0]} />
            <LogoutButton />
          </div>
        </header>
        <main className="px-8 py-10">{children}</main>
      </div>
    </div>
  );
}
