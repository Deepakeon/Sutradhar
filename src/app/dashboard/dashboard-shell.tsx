'use client';

import { useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { ToastContainer } from '@/components/common/ToastContainer';
import { useApp } from '@/context/AppContext';
import type { Profile } from '@/types/profile';

interface DashboardLayoutShellProps {
  children: React.ReactNode;
  user: {
    id: string;
    email?: string | null;
  };
  profile: Profile | null;
}

export function DashboardLayoutShell({ children, user, profile }: DashboardLayoutShellProps) {
  const { currentUser } = useApp();

  // Optionally sync Supabase profile info to AppContext state if available
  useEffect(() => {
    if (user.email && currentUser.email !== user.email) {
      currentUser.email = user.email;
      if (profile?.full_name) {
        currentUser.name = profile.full_name;
      }
      if (profile?.avatar_url) {
        currentUser.avatar = profile.avatar_url;
      }
    }
  }, [user, profile, currentUser]);

  return (
    <div className="min-h-screen bg-[#101010] text-[#f2f2f2] flex flex-col justify-between selection:bg-[#00d992]/20 selection:text-[#00d992]">
      <div>
        {/* Sticky Global Top Navigation */}
        <Navbar />

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>

      {/* Footer per DESIGN.md specifications */}
      <footer className="border-t border-[#3d3a39] bg-[#101010] py-8 mt-12 text-xs text-[#8b949e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[#00d992] text-sm font-bold">⚡ Sutradhar</span>
            <span>•</span>
            <span className="font-mono">User Calibration Platform</span>
            <span>•</span>
            <span className="text-[#bdbdbd]">{profile?.email || user.email || currentUser.email}</span>
          </div>

          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-[11px] font-mono text-[#00d992]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00d992] animate-pulse" />
              <span>User Console Active</span>
            </span>
            <span className="text-[11px] text-[#8b949e]">
              Inter & SF Mono Design System
            </span>
          </div>
        </div>
      </footer>

      {/* Toast Feedback Notifications */}
      <ToastContainer />
    </div>
  );
}
