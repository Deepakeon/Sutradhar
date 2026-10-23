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
        {/* Tile 1: Short Profile Block (5 cols) */}
        <div className="lg:col-span-5 rounded-[12px] bg-[#1a1a1a] border border-[#3d3a39] p-5 flex flex-col justify-between space-y-4 hover:border-[#00d992]/40 transition-colors shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#3d3a39]/70 pb-3">
              <span className="text-[11px] font-mono uppercase tracking-[2px] text-[#8b949e]">
                USER PROFILE
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/40">
                VERIFIED USER
              </span>
            </div>

            <div className="flex items-start gap-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-14 h-14 rounded-full border border-[#3d3a39] object-cover ring-2 ring-[#00d992]/30 flex-shrink-0"
              />
              <div className="min-w-0">
                <h2 className="text-base font-bold text-[#ffffff] truncate">
                  {currentUser.name}
                </h2>
                <p className="text-xs text-[#00d992] font-mono mt-0.5">
                  {currentUser.email}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#bdbdbd] line-clamp-2 leading-relaxed">
              {profile.headline}
            </p>

            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#8b949e] font-semibold block">
                Prepare for:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {profile.domains.slice(0, 3).map((dom) => (
                  <span key={dom} className="text-[10.5px] font-mono px-2 py-0.5 rounded-[4px] bg-[#101010] border border-[#3d3a39] text-[#bdbdbd]">
                    {dom}
                  </span>
                ))}
                {profile.domains.length > 3 && (
                  <span className="text-[10.5px] font-mono px-1.5 py-0.5 text-[#8b949e]">
                    +{profile.domains.length - 3} more
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#3d3a39]/70 flex items-center justify-between">
            <Link
              href="/dashboard/profile"
              className="text-xs font-semibold text-[#2fd6a1] hover:text-[#00d992] transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>View Full Profile</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Tile 2: Live Notification & Action Hub (7 cols) */}
        <div className="lg:col-span-7 rounded-[12px] bg-[#1a1a1a] border border-[#3d3a39] p-5 flex flex-col justify-between space-y-4 shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#3d3a39]/70 pb-3">
              <span className="text-[11px] font-mono uppercase tracking-[2px] text-[#8b949e] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>LIVE NOTIFICATION HUB</span>
              </span>
              <span className="text-[10.5px] font-mono text-[#8b949e]">
                {pendingRequests.length} Action{pendingRequests.length !== 1 ? 's' : ''} Due
              </span>
            </div>

            {/* Priority 1: Pending Request Alert */}
            {pendingRequests.length > 0 ? (
              <div className="p-3.5 rounded-[8px] bg-[#101010] border-2 border-amber-400/50 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pendingRequests[0].candidateAvatar}
                      alt={pendingRequests[0].candidateName}
                      className="w-8 h-8 rounded-full border border-[#3d3a39] object-cover"
                    />
                    <div>
                      <p className="text-xs font-bold text-[#f2f2f2]">
                        New Request: {pendingRequests[0].candidateName}
                      </p>
                      <p className="text-[11px] text-[#8b949e] font-mono">
                        {pendingRequests[0].format} • {pendingRequests[0].scheduledAt}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-400/15 text-amber-400 border border-amber-400/40 uppercase">
                    Action Required
                  </span>
                </div>

                {pendingRequests[0].candidateNotes && (
                  <p className="text-[11.5px] text-[#bdbdbd] italic bg-[#1a1a1a] p-2 rounded border border-[#3d3a39]/60 line-clamp-1">
                    &ldquo;{pendingRequests[0].candidateNotes}&rdquo;
                  </p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAcceptRequest(pendingRequests[0].id)}
                      className="inline-flex items-center justify-center font-semibold rounded-[6px] bg-[#00d992] text-[#101010] hover:bg-[#2fd6a1] transition-all text-[11px] px-3 py-1 cursor-pointer"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(pendingRequests[0].id)}
                      className="inline-flex items-center justify-center font-semibold rounded-[6px] border border-[#3d3a39] bg-[#101010] text-[#f2f2f2] hover:border-red-500/40 hover:bg-[#1a1a1a] transition-all text-[11px] px-3 py-1 text-red-400 hover:text-red-300 cursor-pointer"
                    >
                      Decline
                    </button>
                  </div>
                  <Link
                    href="/dashboard/calls"
                    className="text-[11px] text-[#2fd6a1] hover:text-[#00d992] cursor-pointer"
                  >
                    Open In Sessions Tab →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-[8px] bg-[#101010] border border-[#3d3a39] text-xs text-[#8b949e] flex items-center gap-2">
                <span className="text-[#00d992]">✓</span>
                <span>All incoming requests resolved. Your inbox is up-to-date.</span>
              </div>
            )}

            {/* Priority 2: Next Upcoming Mock Session */}
            {nextUpcomingSession && (
              <div className="p-3 rounded-[8px] bg-[#101010] border border-[#00d992]/40 flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00d992]" />
                    <span className="text-[11px] font-mono uppercase text-[#00d992] font-semibold">
                      Upcoming Session
                    </span>
                    <span className="text-[11px] text-[#8b949e] font-mono">
                      • {nextUpcomingSession.scheduledAt}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#f2f2f2] truncate">
                    {nextUpcomingSession.format} with {nextUpcomingSession.candidateName}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {nextUpcomingSession.meetingUrl && (
                    <a
                      href={nextUpcomingSession.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center font-semibold rounded-[6px] bg-[#00d992] text-[#101010] hover:bg-[#2fd6a1] transition-all text-[11px] px-3 py-1 flex items-center gap-1 cursor-pointer"
                    >
                      <span>⚡ Launch</span>
                    </a>
                  )}
                  <button
                    onClick={() => setEvaluatingSession(nextUpcomingSession)}
                    className="inline-flex items-center justify-center font-semibold rounded-[6px] border border-[#3d3a39] bg-[#101010] text-[#f2f2f2] hover:border-[#8b949e] hover:bg-[#1a1a1a] transition-all text-[11px] px-2.5 py-1 cursor-pointer"
                  >
                    Evaluate
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Status Counters Strip */}
          {/* Status Counters Strip - 3 Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-[#3d3a39]/70 text-left">
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
        <div className="lg:col-span-7 rounded-[12px] bg-[#1a1a1a] border border-[#3d3a39] p-5 space-y-4 shadow-xs">
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

          {/* Bottom link to Find Interviews page */}
          <div className="pt-2 border-t border-[#3d3a39]/60 flex justify-end">
            <Link
              href="/dashboard/interviews"
              className="text-xs font-semibold text-[#00d992] hover:text-[#2fd6a1] cursor-pointer flex items-center gap-1.5"
            >
              <span>Go to Find Interviews page</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Tile 6: Operating Model & Availability (5 cols) */}
        <div className="lg:col-span-5 rounded-[12px] bg-[#1a1a1a] border border-[#3d3a39] p-5 flex flex-col justify-between space-y-4 shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#3d3a39]/70 pb-3">
              <span className="text-[11px] font-mono uppercase tracking-[2px] text-[#8b949e]">
                OPERATING MODEL
              </span>
              <button
                onClick={() => handleOpenEditor('context')}
                className="text-xs text-[#2fd6a1] hover:text-[#00d992] cursor-pointer"
              >
                Edit →
              </button>
            </div>

            <div>
              <span className="text-[10.5px] font-mono text-[#8b949e] uppercase">Formats Evaluated</span>
              <div className="space-y-1 mt-1">
                {profile.context.sessionFormats.map((fmt) => (
                  <div key={fmt} className="text-xs font-mono text-[#f2f2f2] bg-[#101010] p-1.5 rounded border border-[#3d3a39] truncate">
                    ✓ {fmt}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10.5px] font-mono text-[#8b949e] uppercase">Weekly Schedule</span>
              <p className="text-xs text-[#bdbdbd] mt-1 font-mono bg-[#101010] p-2 rounded border border-[#3d3a39]">
                {profile.context.availabilitySchedule}
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center text-[10.5px] font-mono">
                <span className="text-[#8b949e] uppercase">Capacity Load</span>
                <span className="text-[#00d992] font-semibold">{acceptedSessions.length} / {profile.context.maxSessionsPerWeek} slots booked</span>
              </div>
              <div className="h-1.5 w-full bg-[#101010] rounded-full overflow-hidden border border-[#3d3a39] mt-1">
                <div
                  className="h-full bg-[#00d992] rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (acceptedSessions.length / (profile.context.maxSessionsPerWeek || 1)) * 100)}%`
                  }}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#3d3a39]/70 flex items-center justify-between">
            <span className="text-[11px] text-[#00d992] font-mono">
              {profile.context.hourlyHonorarium}
            </span>
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
