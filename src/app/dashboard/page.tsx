'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { InterviewSession } from '@/types';
import { UserProfileEditorModal } from '@/components/user/UserProfileEditorModal';
import { QuestionnaireModal } from '@/components/user/QuestionnaireModal';
import { InviteCandidateModal } from '@/components/user/InviteCandidateModal';
import { ViewQuestionnaireModal } from '@/components/common/ViewQuestionnaireModal';

export default function DashboardOverviewPage() {
  const {
    currentUser,
    matchingCandidates,
    sessions,
    updateSessionStatus,
    showToast
  } = useApp();

  const profile = currentUser.interviewerProfile;

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorSection, setEditorSection] = useState<'context' | 'skill' | 'credentials'>('context');
  const [evaluatingSession, setEvaluatingSession] = useState<InterviewSession | null>(null);
  const [viewingScorecardSession, setViewingScorecardSession] = useState<InterviewSession | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<typeof matchingCandidates[0] | null>(null);

  const userSessions = sessions.filter((s) => s.interviewerId === currentUser.id);
  const pendingRequests = userSessions.filter((s) => s.status === 'pending');
  const acceptedSessions = userSessions.filter((s) => s.status === 'accepted');
  const completedSessions = userSessions.filter((s) => s.status === 'completed');
  const nextUpcomingSession = acceptedSessions[0];

  const handleOpenEditor = (section: 'context' | 'skill' | 'credentials' = 'context') => {
    setEditorSection(section);
    setIsEditorOpen(true);
  };

  const handleAcceptRequest = (sessionId: string) => {
    updateSessionStatus(sessionId, 'accepted');
  };

  const handleDeclineRequest = (sessionId: string) => {
    updateSessionStatus(sessionId, 'declined');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* Bento Grid Row 1: Profile Block & Notification / Action Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Tile: Live Notification & Action Hub */}
        <div className="lg:col-span-12 rounded-[12px] bg-[#1a1a1a] border border-[#3d3a39] p-5 flex flex-col justify-between space-y-4 hover:border-[#00d992]/40 transition-colors shadow-xs">
          <div className="space-y-4">
            {/* Main Content Block: Prepare for & Skills */}
            <div className="p-4 rounded-[10px] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[20px] font-mono uppercase tracking-wider text-[#00d992] font-semibold">
                    Prepare for
                  </span>
                  <span className="text-base font-bold text-[#ffffff]">
                    {nextUpcomingSession?.format || ((Array.isArray(profile.targetRoles) && typeof profile.targetRoles[0] === 'string') ? profile.targetRoles[0] : 'Staff & Principal Calibrations')}
                  </span>
                </div>

                <p className="text-xs text-[#bdbdbd] leading-relaxed max-w-2xl">
                  {nextUpcomingSession?.candidateNotes || (typeof profile.headline === 'string' ? profile.headline : 'Senior Distributed Systems Engineer targeting Staff / Principal Roles')}
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(Array.isArray(profile.domains) ? profile.domains : []).slice(0, 4).map((dom) => {
                    const domText = typeof dom === 'string' ? dom : '';
                    if (!domText) return null;
                    return (
                      <span key={domText} className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-[#1a1a1a] border border-[#3d3a39] text-[#bdbdbd]">
                        {domText}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 flex-shrink-0 pt-2 md:pt-0">
                <Link
                  href="/dashboard/interviews"
                  className="inline-flex items-center justify-center font-semibold rounded-[6px] bg-[#00d992] text-[#101010] hover:bg-[#2fd6a1] transition-all text-xs px-3.5 py-2 cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <span>Browse Interviewers</span>
                  <span>→</span>
                </Link>
                <button
                  type="button"
                  onClick={() => handleOpenEditor('context')}
                  className="inline-flex items-center justify-center font-semibold rounded-[6px] border border-[#3d3a39] bg-[#101010] text-[#f2f2f2] hover:border-[#8b949e] hover:bg-[#1a1a1a] transition-all text-xs px-3.5 py-2 cursor-pointer shadow-xs"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>

          {/* Status Counters Strip - 3 Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 text-left">
            {/* Upcoming Mocks */}
            <Link
              href="/dashboard/calls"
              className="p-3 rounded-[8px] bg-[#101010] border border-[#3d3a39] hover:border-[#00d992]/40 transition-colors flex flex-col justify-between space-y-1 shadow-xs cursor-pointer group"
            >
              <span className="text-[10px] font-mono text-[#8b949e] uppercase tracking-wider block">
                Upcoming Mocks
              </span>
              <p className="text-xl font-bold text-[#f2f2f2]">
                {acceptedSessions.length > 0 ? acceptedSessions.length : 1}
              </p>
              <span className="text-[11px] font-mono text-[#00d992]">
                Next: Tomorrow
              </span>
            </Link>

            {/* Top Bar Raisers */}
            <Link
              href="/dashboard/interviews"
              className="p-3 rounded-[8px] bg-[#101010] border border-[#3d3a39] hover:border-[#00d992]/40 transition-colors flex flex-col justify-between space-y-1 shadow-xs cursor-pointer group"
            >
              <span className="text-[10px] font-mono text-[#8b949e] uppercase tracking-wider block">
                Top Bar Raisers
              </span>
              <p className="text-xl font-bold text-[#f2f2f2]">
                {matchingCandidates.filter((c) => c.compatibilityScore >= 90).length || 4}
              </p>
              <span className="text-[11px] font-mono text-[#bdbdbd]">
                Up to {Math.max(...matchingCandidates.map((c) => c.compatibilityScore), 98)}% compatibility
              </span>
            </Link>

            {/* Pending Requests */}
            <Link
              href="/dashboard/calls"
              className="p-3 rounded-[8px] bg-[#101010] border border-[#3d3a39] hover:border-[#00d992]/40 transition-colors flex flex-col justify-between space-y-1 shadow-xs cursor-pointer group"
            >
              <span className="text-[10px] font-mono text-[#8b949e] uppercase tracking-wider block">
                Pending Requests
              </span>
              <p className="text-xl font-bold text-amber-400">
                {pendingRequests.length > 0 ? pendingRequests.length : 1}
              </p>
              <span className="text-[11px] font-mono text-[#8b949e]">
                Awaiting confirmation
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Bento Grid Row 2: Recent Calibrations & Operating Model */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Tile: Recent Calibrations Tile (7 cols) */}
        {/* Tile: Top Matching Interviewers - suggestion (7 cols) */}
        <div className="lg:col-span-7 rounded-[12px] p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[#3d3a39]/70 pb-3">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-[2px] text-[#8b949e] font-semibold block">
                Top Matching Interviewers - suggestion
              </span>
              <p className="text-[11px] text-[#8b949e] font-mono mt-0.5">
                Ranked by technical domain alignment sort by percentage match
              </p>
            </div>
            <Link
              href="/dashboard/interviews"
              className="text-xs font-semibold text-[#2fd6a1] hover:text-[#00d992] transition-colors cursor-pointer whitespace-nowrap"
            >
              View All ({matchingCandidates.length}) →
            </Link>
          </div>

          {/* Top 2 Matching Cards sorted by compatibility percentage */}
          <div className="space-y-3">
            {[...matchingCandidates]
              .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
              .slice(0, 2)
              .map((interviewer) => (
                <div
                  key={interviewer.id}
                  className="p-3.5 rounded-[8px] bg-[#101010] border border-[#3d3a39] space-y-3 hover:border-[#00d992]/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={interviewer.avatar}
                        alt={interviewer.name}
                        className="w-10 h-10 rounded-full border border-[#3d3a39] object-cover ring-1 ring-[#00d992]/30 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-[#f2f2f2] truncate">
                            {interviewer.name}
                          </h4>
                          <span className="text-[10px] font-mono text-[#8b949e]">
                            • {interviewer.currentCompany} ({interviewer.yearsExperience} yrs)
                          </span>
                        </div>
                        <p className="text-[11.5px] text-[#00d992] font-semibold mt-0.5 truncate">
                          {interviewer.targetRole}
                        </p>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/40 flex-shrink-0">
                      {interviewer.compatibilityScore}% MATCH
                    </span>
                  </div>

                  {interviewer.headline && (
                    <p className="text-xs text-[#bdbdbd] line-clamp-1">
                      {interviewer.headline}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#3d3a39]/50">
                    <div className="flex flex-wrap gap-1">
                      {(interviewer.skills ? interviewer.skills.map((s) => s.name) : interviewer.keySkills).slice(0, 3).map((sk) => (
                        <span key={sk} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1a1a1a] border border-[#3d3a39] text-[#bdbdbd]">
                          {sk}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => setSelectedCandidate(interviewer)}
                      className="inline-flex items-center justify-center font-semibold rounded-[5px] bg-[#00d992] text-[#101010] hover:bg-[#2fd6a1] transition-all text-[11px] px-3 py-1 cursor-pointer"
                    >
                      Invite
                    </button>
                  </div>
                </div>
              ))}
          </div>

          
        </div>

        {/* Tile 6: Active Prep Profile (5 cols) */}
        <div className="lg:col-span-5 rounded-[12px] bg-[#1a1a1a] border border-[#3d3a39] p-5 flex flex-col justify-between space-y-4 hover:border-[#00d992]/40 transition-colors shadow-xs">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#3d3a39]/70 pb-3">
              <span className="text-[11px] font-mono uppercase tracking-[2px] text-[#8b949e]">
                ACTIVE PREP PROFILE
              </span>
              <button
                onClick={() => handleOpenEditor('context')}
                className="text-xs text-[#2fd6a1] hover:text-[#00d992] cursor-pointer"
              >
                Edit →
              </button>
            </div>

            {/* Target Roles */}
            <div>
              <span className="text-[10px] font-mono text-[#8b949e] uppercase tracking-wider block">
                Target Roles
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {(Array.isArray(profile.targetRoles) ? profile.targetRoles : Array.isArray(currentUser.candidateProfile.targetRoles) ? currentUser.candidateProfile.targetRoles : [])
                  .filter((role): role is string => typeof role === 'string' && role.trim().length > 0)
                  .map((role) => (
                    <span
                      key={role}
                      className="text-xs font-mono text-[#f2f2f2] bg-[#101010] px-2.5 py-1 rounded-[5px] border border-[#3d3a39]"
                    >
                      {role}
                    </span>
                  ))}
              </div>
            </div>

            {/* Timezone & Bandwidth */}
            <div>
              <span className="text-[10px] font-mono text-[#8b949e] uppercase tracking-wider block">
                Timezone & Bandwidth
              </span>
              <div className="mt-1.5 p-2.5 rounded-[8px] bg-[#101010] border border-[#3d3a39] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#8b949e]">Timezone</span>
                  <span className="text-[#f2f2f2]">{typeof profile.timezone === 'string' ? profile.timezone : typeof currentUser.candidateProfile.context.preferredTimezone === 'string' ? currentUser.candidateProfile.context.preferredTimezone : 'America/New_York (UTC-5)'}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#8b949e]">Bandwidth</span>
                  <span className="text-[#00d992] font-semibold">{typeof profile.weeklyAvailability === 'string' ? profile.weeklyAvailability : `${currentUser.candidateProfile.context.weeklyAvailabilityHours || 8} hrs / week`}</span>
                </div>
              </div>
            </div>

            {/* Focus Areas */}
            <div>
              <span className="text-[10px] font-mono text-[#8b949e] uppercase tracking-wider block">
                Focus Areas
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {(Array.isArray(currentUser.candidateProfile.context.interviewFocus) && currentUser.candidateProfile.context.interviewFocus.length > 0
                  ? currentUser.candidateProfile.context.interviewFocus
                  : Array.isArray(profile.domains)
                    ? profile.domains
                    : []
                )
                  .filter((focus): focus is string => typeof focus === 'string' && focus.trim().length > 0)
                  .map((focus) => (
                    <span
                      key={focus}
                      className="text-[10.5px] font-mono px-2 py-0.5 rounded-[4px] bg-[#101010] border border-[#3d3a39] text-[#bdbdbd]"
                    >
                      {focus}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#3d3a39]/70 flex items-center justify-between">
            <span className="text-[11px] text-[#00d992] font-mono">
              {profile.context.hourlyHonorarium || 'Reciprocal Mock / Free'}
            </span>
            <Link
              href="/dashboard/profile"
              className="text-xs font-semibold text-[#2fd6a1] hover:text-[#00d992] transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>Full Profile</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedCandidate && (
        <InviteCandidateModal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
        />
      )}

      {isEditorOpen && (
        <UserProfileEditorModal
          initialSection={editorSection}
          onClose={() => setIsEditorOpen(false)}
        />
      )}

      {evaluatingSession && (
        <QuestionnaireModal
          session={evaluatingSession}
          onClose={() => setEvaluatingSession(null)}
        />
      )}

      {viewingScorecardSession && (
        <ViewQuestionnaireModal
          session={viewingScorecardSession}
          onClose={() => setViewingScorecardSession(null)}
        />
      )}
    </div>
  );
}
