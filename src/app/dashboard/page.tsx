import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/profile';
import { DashboardInterviews } from '@/components/dashboard/dashboard-interviews';

export const metadata = {
  title: 'Dashboard — Sutradhar',
};

export const instant = false;

async function DashboardContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profileData } = await supabase.rpc('get_my_profile');
  const profile = profileData as unknown as Profile | null;

  const { data: interviewsData } = await supabase
    .schema('private')
    .from('interviews')
    .select('*')
    .or(`candidate_id.eq.${user.id},interviewer_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  const mappedInterviews = (interviewsData || []).map(
    (inv: {
      id: string;
      title?: string | null;
      status: string;
      candidate_id: string;
      interviewer_id: string;
      scheduled_at?: string | null;
    }) => ({
      id: inv.id,
      title: inv.title || 'Technical Interview',
      status: inv.status,
      role: inv.candidate_id === user.id ? 'candidate' : 'interviewer',
      date: inv.scheduled_at ? new Date(inv.scheduled_at).toLocaleDateString() : undefined,
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[#3d3a39] pb-4">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            className="rounded bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
          >
            logout
          </button>
        </form>
      </div>

      <div className="rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a] p-6 space-y-3">
        <h2 className="text-lg font-semibold text-white">
          Active Profile (private.profiles)
        </h2>
        <div className="space-y-1 text-sm text-[#bdbdbd]">
          <p>
            <strong className="text-white">ID:</strong> {user.id}
          </p>
          <p>
            <strong className="text-white">Email:</strong>{' '}
            {profile?.email ?? user.email ?? 'N/A'}
          </p>
          <p>
            <strong className="text-white">Full Name:</strong>{' '}
            {profile?.full_name ?? 'N/A'}
          </p>
          {profile?.avatar_url && (
            <p>
              <strong className="text-white">Avatar URL:</strong>{' '}
              {profile.avatar_url}
            </p>
          )}
        </div>
      </div>

      {/* Local Interviews & Recordings Section */}
      <DashboardInterviews initialInterviews={mappedInterviews} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#101010] p-8 text-[#f2f2f2]">
      <div className="mx-auto max-w-4xl">
        <Suspense
          fallback={
            <div className="flex h-32 items-center justify-center rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a]">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#00d992] border-t-transparent" />
            </div>
          }
        >
          <DashboardContent />
        </Suspense>
      </div>
    </main>
  );
}
