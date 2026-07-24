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

  return (
    <div className="flex">
      <Sidebar roles={roles} />
      <div className="flex-1">
        <header className="flex items-center justify-between px-8 py-5">
          <p className="text-sm text-ink-muted">{session?.email ?? 'Not signed in'}</p>
          <div className="flex items-center gap-5">
            <InstallAppButton />
            <RoleBadge role={roles[0]} />
            <LogoutButton />
          </div>
        </header>
        <main className="px-8 pb-10">{children}</main>
      </div>
    </div>
  );
}
