import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/profile';
import { DashboardLayoutShell } from './dashboard-shell';

export const metadata = {
  title: 'Interviewer Dashboard — Sutradhar',
  description: 'Technical Mock Interviewer Evaluation & Calibration Dashboard',
};

async function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  let profile: Profile | null = null;
  try {
    const { data: profileData } = await supabase.rpc('get_my_profile');
    profile = profileData as unknown as Profile | null;
  } catch (err) {
    console.error('Error fetching profile:', err);
  }

  return (
    <DashboardLayoutShell
      user={{ id: user.id, email: user.email }}
      profile={profile}
    >
      {children}
    </DashboardLayoutShell>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#101010]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00d992] border-t-transparent" />
            <span className="font-mono text-xs text-[#8b949e]">Loading Sutradhar Dashboard...</span>
          </div>
        </div>
      }
    >
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  );
}
