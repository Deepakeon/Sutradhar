'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export function Navbar() {
  const { currentUser, sessions } = useApp();
  const pathname = usePathname();

  const pendingUserRequests = sessions.filter(
    (s) => s.interviewerId === currentUser.id && s.status === 'pending'
  ).length;

  const userTabs = [
    { href: '/dashboard', label: 'Overview' },
    { href: '/dashboard/profile', label: 'My Profile' },
    { href: '/dashboard/interviews', label: 'Browse Interviews' },
    {
      href: '/dashboard/calls',
      label: 'Calls',
      badge: pendingUserRequests > 0 ? pendingUserRequests : undefined
    }
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#101010] border-b border-[#3d3a39]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Eyebrow */}
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 text-left group transition-opacity hover:opacity-90"
            >
              <div className="w-8 h-8 rounded-[6px] bg-[#1a1a1a] border border-[#3d3a39] flex items-center justify-center text-[#00d992] text-lg font-bold group-hover:border-[#00d992]/60 transition-colors">
                ⚡
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-[#f2f2f2]">
                  Sutradhar
                </span>
                <span className="text-[10px] uppercase font-mono tracking-[1.5px] text-[#8b949e]">
                  User Console
                </span>
              </div>
            </Link>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1">
              {userTabs.map((tab) => {
                const active = isActive(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`px-3 py-1.5 rounded-[6px] text-sm font-medium transition-all duration-150 flex items-center gap-2 ${
                      active
                        ? 'bg-[#1a1a1a] text-[#f2f2f2] border border-[#3d3a39]'
                        : 'text-[#bdbdbd] hover:text-[#f2f2f2] hover:bg-[#1a1a1a]/50'
                    }`}
                  >
                    {tab.label}
                    {tab.badge !== undefined && (
                      <span className="px-1.5 py-0.2 text-[11px] font-semibold rounded-full bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/40">
                        {tab.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Section: User Profile & Sign Out */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full border border-[#3d3a39] object-cover"
              />
              <div className="hidden sm:flex flex-col">
                <span className="text-xs font-semibold text-[#f2f2f2] leading-tight">
                  {currentUser.name}
                </span>
                <span className="text-[10px] font-mono text-[#00d992]">
                  Verified User
                </span>
              </div>
            </div>

            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className="px-2.5 py-1.5 rounded-[6px] border border-[#3d3a39] hover:border-[#8b949e] bg-[#1a1a1a] text-xs font-medium text-[#bdbdbd] hover:text-[#f2f2f2] transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="md:hidden flex items-center gap-2 py-2 overflow-x-auto border-t border-[#3d3a39]/50">
          {userTabs.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-2.5 py-1 rounded-[6px] text-xs font-medium whitespace-nowrap ${
                  active
                    ? 'bg-[#1a1a1a] text-[#f2f2f2] border border-[#3d3a39]'
                    : 'text-[#bdbdbd]'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
