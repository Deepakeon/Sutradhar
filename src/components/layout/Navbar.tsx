'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { UserRole } from '@/types';

export function Navbar() {
  const { currentUser, activeRole, setActiveRole, activeTab, setActiveTab, sessions } = useApp();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pendingInterviewerRequests = sessions.filter(
    (s) => s.interviewerId === currentUser.id && s.status === 'pending'
  ).length;

  const upcomingCandidateMeetings = sessions.filter(
    (s) => s.candidateId === currentUser.id && (s.status === 'accepted' || s.status === 'pending')
  ).length;

  const handleRoleSelect = (role: UserRole) => {
    if (role !== activeRole) {
      setActiveRole(role);
    }
    setDropdownOpen(false);
  };

  const candidateTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'profile', label: 'My Profile' },
    { id: 'match', label: 'Find Interviewers' },
    {
      id: 'sessions',
      label: 'Calls',
      badge: upcomingCandidateMeetings > 0 ? upcomingCandidateMeetings : undefined
    }
  ];

  const interviewerTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'profile', label: 'My Profile' },
    { id: 'match', label: 'Browse Candidates' },
    {
      id: 'sessions',
      label: 'Calls',
      badge: pendingInterviewerRequests > 0 ? pendingInterviewerRequests : undefined
    },
    { id: 'questionnaires', label: 'Scorecards' }
  ];

  const currentTabs = activeRole === 'candidate' ? candidateTabs : interviewerTabs;

  return (
    <header className="sticky top-0 z-40 w-full bg-[#101010] border-b border-[#3d3a39]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Eyebrow */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('overview')}
              className="flex items-center gap-2.5 text-left group transition-opacity hover:opacity-90 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-[6px] bg-[#1a1a1a] border border-[#3d3a39] flex items-center justify-center text-[#00d992] text-lg font-bold group-hover:border-[#00d992]/60 transition-colors">
                ⚡
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-[#f2f2f2]">
                  Sutradhar
                </span>
                <span className="text-[10px] uppercase font-mono tracking-[1.5px] text-[#8b949e]">
                  Dual-Role Engine
                </span>
              </div>
            </button>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1">
              {currentTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-[6px] text-sm font-medium transition-all duration-150 flex items-center gap-2 cursor-pointer ${isActive
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
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Section: Role Switcher Dropdown & Account */}
          <div className="flex items-center gap-3">
            {/* Top-Level Role Switcher Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-[6px] bg-[#1a1a1a] border border-[#3d3a39] hover:border-[#00d992]/50 text-sm font-medium transition-all cursor-pointer group"
                aria-expanded={dropdownOpen}
                aria-label="Toggle user role dropdown"
              >
                <span className="w-2 h-2 rounded-full bg-[#00d992] animate-pulse" />
                <span className="text-[#8b949e] text-xs font-mono">ROLE:</span>
                <span className="text-[#f2f2f2] font-semibold flex items-center gap-1.5">
                  {activeRole === 'candidate' ? (
                    <>
                      <span>🎓</span>
                      <span>Candidate</span>
                    </>
                  ) : (
                    <>
                      <span>🎙️</span>
                      <span>Interviewer</span>
                    </>
                  )}
                </span>
                <svg
                  className={`w-3.5 h-3.5 text-[#8b949e] group-hover:text-[#f2f2f2] transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''
                    }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-[8px] bg-[#1a1a1a] border border-[#3d3a39] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-[#3d3a39]/70 mb-1">
                    <p className="text-[11px] font-mono tracking-wider text-[#8b949e] uppercase">
                      Switch Role (Same Account)
                    </p>
                    <p className="text-xs text-[#bdbdbd] mt-0.5">
                      Toggle active mode instantly without logging out. Both profile states are preserved.
                    </p>
                  </div>

                  {/* Option 1: Candidate Role */}
                  <button
                    onClick={() => handleRoleSelect('candidate')}
                    className={`w-full text-left p-2.5 rounded-[6px] transition-all flex items-start gap-3 cursor-pointer ${activeRole === 'candidate'
                        ? 'bg-[#101010] border border-[#00d992]/50'
                        : 'hover:bg-[#101010]/60 border border-transparent'
                      }`}
                  >
                    <div className="w-8 h-8 rounded-[6px] bg-[#101010] border border-[#3d3a39] flex items-center justify-center text-base flex-shrink-0">
                      🎓
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[#f2f2f2]">
                          Candidate Mode
                        </span>
                        {activeRole === 'candidate' ? (
                          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/40">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#8b949e] group-hover:text-[#f2f2f2]">
                            Select →
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#8b949e] mt-0.5 line-clamp-2">
                        View candidate profile, browse ranked interviewers, track requests & scheduled mocks.
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-[10px] text-[#2fd6a1] font-mono">
                          ✓ Target: Staff / Principal
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Option 2: Interviewer Role */}
                  <button
                    onClick={() => handleRoleSelect('interviewer')}
                    className={`w-full text-left p-2.5 rounded-[6px] transition-all flex items-start gap-3 mt-1 cursor-pointer ${activeRole === 'interviewer'
                        ? 'bg-[#101010] border border-[#00d992]/50'
                        : 'hover:bg-[#101010]/60 border border-transparent'
                      }`}
                  >
                    <div className="w-8 h-8 rounded-[6px] bg-[#101010] border border-[#3d3a39] flex items-center justify-center text-base flex-shrink-0">
                      🎙️
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[#f2f2f2]">
                          Interviewer Mode
                        </span>
                        {activeRole === 'interviewer' ? (
                          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/40">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#8b949e] group-hover:text-[#f2f2f2]">
                            Select →
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#8b949e] mt-0.5 line-clamp-2">
                        Manage rubric & schedule, accept session requests, evaluate mock scorecards.
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-[10px] text-[#2fd6a1] font-mono">
                          ✓ Bar Raiser (180+ sessions)
                        </span>
                      </div>
                    </div>
                  </button>

                  <div className="mt-2 pt-2 border-t border-[#3d3a39]/70 px-2 flex items-center justify-between text-[11px] text-[#8b949e]">
                    <span>Account: {currentUser.email}</span>
                    <span className="text-[#00d992] font-mono">Synced</span>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar with Role Pill */}
            <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-[#3d3a39]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full border border-[#3d3a39] object-cover"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-[#f2f2f2] leading-tight">
                  {currentUser.name}
                </span>
                <span className="text-[10px] font-mono text-[#8b949e]">
                  {activeRole === 'candidate' ? 'Staff Candidate' : 'Bar Raiser'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="md:hidden flex items-center gap-2 py-2 overflow-x-auto border-t border-[#3d3a39]/50">
          {currentTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1 rounded-[6px] text-xs font-medium whitespace-nowrap cursor-pointer ${isActive
                    ? 'bg-[#1a1a1a] text-[#f2f2f2] border border-[#3d3a39]'
                    : 'text-[#bdbdbd]'
                  }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
