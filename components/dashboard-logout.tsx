'use client';

import { useRouter } from 'next/navigation';

export function DashboardLogout() {
  const router = useRouter();

  async function onLogout() {
    await fetch('/api/dashboard-auth', { method: 'DELETE' });
    router.push('/dashboard-login');
    router.refresh();
  }

  return (
    <button onClick={onLogout} className="rounded-xl border border-white/20 px-4 py-2 text-sm">
      Logout
    </button>
  );
}
