'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { MatchingCandidate, InterviewSession } from '@/types';
import { QuestionnaireModal } from './QuestionnaireModal';
import { InterviewerProfileEditorModal } from './InterviewerProfileEditorModal';
import { InviteCandidateModal } from './InviteCandidateModal';
import { ViewQuestionnaireModal } from '@/components/common/ViewQuestionnaireModal';

export function InterviewerDashboard() {
  const {
    currentUser,
    activeTab,
    setActiveTab,
    matchingCandidates,
    sessions,
    updateSessionStatus,
    updateInterviewerProfile,
    showToast
  } = useApp();

  const profile = currentUser.interviewerProfile;

  // Modals state
  const [selectedCandidate, setSelectedCandidate] = useState<MatchingCandidate | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorSection, setEditorSection] = useState<'context' | 'skill' | 'credentials'>('context');
  const [evaluatingSession, setEvaluatingSession] = useState<InterviewSession | null>(null);
  const [viewingScorecardSession, setViewingScorecardSession] = useState<InterviewSession | null>(null);

  // Search & Filter state for Matching Candidates
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');

  // Filter for Requests & Sessions
  const [sessionsFilter, setSessionsFilter] = useState<'all' | 'pending' | 'accepted' | 'completed'>('all');

  // Sessions where current user is interviewer
  const interviewerSessions = sessions.filter((s) => s.interviewerId === currentUser.id);

  const pendingRequests = interviewerSessions.filter((s) => s.status === 'pending');
  const acceptedSessions = interviewerSessions.filter((s) => s.status === 'accepted');
  const completedSessions = interviewerSessions.filter((s) => s.status === 'completed');

  const nextUpcomingSession = acceptedSessions[0];

  const filteredCandidates = matchingCandidates
    .filter((candidate) => {
      const matchesSearch =
        candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        candidate.currentCompany.toLowerCase().includes(searchQuery.toLowerCase()) ||
        candidate.targetRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
        candidate.keySkills.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDomain =
        selectedDomain === 'all' ||
        candidate.domains.some((d) => d.toLowerCase().includes(selectedDomain.toLowerCase()));

      return matchesSearch && matchesDomain;
    })
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  const filteredSessions = interviewerSessions.filter((s) => {
    if (sessionsFilter === 'all') return true;
    return s.status === sessionsFilter;
  });

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

  const handleDeleteSkill = (skillId: string) => {
    updateInterviewerProfile({
      skills: profile.skills.filter((s) => s.id !== skillId)
    });
    showToast('Assessment capability removed', 'info');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. OVERVIEW SECTION: Executive Collage / Bento Grid View
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top Banner Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#3d3a39]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00d992] animate-pulse" />
              <h1 className="text-xl font-bold text-[#f2f2f2] tracking-tight">
                Interviewer Executive Dashboard
              </h1>
              <span className="text-xs font-mono text-[#8b949e]">
                • Quick App Collage & Command Center
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenEditor('context')}
                className="btn-primary text-xs px-3.5 py-1.5 cursor-pointer flex items-center gap-1.5"
              >
                <span>✎</span>
                <span>Edit Portfolio</span>
              </button>
            </div>
          </div>

          {/* Bento Grid Row 1: Profile Block & Notification / Action Hub */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Tile 1: Short Profile Block (5 cols) */}
            <div className="lg:col-span-5 rounded-[12px] bg-[#1a1a1a] border border-[#3d3a39] p-5 flex flex-col justify-between space-y-4 hover:border-[#00d992]/40 transition-colors shadow-xs">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#3d3a39]/70 pb-3">
                  <span className="text-[11px] font-mono uppercase tracking-[2px] text-[#8b949e]">
                    INTERVIEWER PROFILE
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/40">
                    BAR RAISER
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
                    <p className="text-xs text-[#00d992] font-semibold mt-0.5">
                      {profile.experience.primaryCompany} • {profile.experience.yearsInterviewing} yrs tenure
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs font-mono text-[#8b949e]">
                      <span className="text-amber-300 font-bold">★ {profile.experience.averageRating}</span>
                      <span>•</span>
                      <span>{profile.experience.totalInterviewsConducted}+ mocks</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[#bdbdbd] line-clamp-2 leading-relaxed">
                  {profile.headline}
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
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

              <div className="pt-3 border-t border-[#3d3a39]/70 flex items-center justify-between">
                <button
                  onClick={() => setActiveTab('profile')}
                  className="text-xs font-semibold text-[#2fd6a1] hover:text-[#00d992] transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>View Full Profile</span>
                  <span>→</span>
                </button>
                <button
                  onClick={() => handleOpenEditor('context')}
                  className="btn-outline text-[11px] px-3 py-1 cursor-pointer"
                >
                  ✎ Edit Portfolio
                </button>
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
                          className="btn-primary text-[11px] px-3 py-1 cursor-pointer"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDeclineRequest(pendingRequests[0].id)}
                          className="btn-outline text-[11px] px-3 py-1 text-red-400 hover:text-red-300 cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                      <button
                        onClick={() => setActiveTab('sessions')}
                        className="text-[11px] text-[#2fd6a1] hover:text-[#00d992] cursor-pointer"
                      >
                        Open In Sessions Tab →
                      </button>
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
                          className="btn-primary text-[11px] px-3 py-1 flex items-center gap-1 cursor-pointer"
                        >
                          <span>⚡ Launch</span>
                        </a>
                      )}
                      <button
                        onClick={() => setEvaluatingSession(nextUpcomingSession)}
                        className="btn-outline text-[11px] px-2.5 py-1 cursor-pointer"
                      >
                        Evaluate
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Counters Strip */}
              <div className="grid grid-cols-4 gap-2 pt-3 border-t border-[#3d3a39]/70 text-center">
                <div
                  onClick={() => setActiveTab('sessions')}
                  className="p-2 rounded bg-[#101010] border border-[#3d3a39] cursor-pointer hover:border-[#00d992]/40 transition-colors"
                >
                  <span className="text-[10px] font-mono text-[#8b949e] uppercase">Requests</span>
                  <p className="text-base font-bold text-[#f2f2f2]">{pendingRequests.length}</p>
                </div>
                <div
                  onClick={() => setActiveTab('sessions')}
                  className="p-2 rounded bg-[#101010] border border-[#3d3a39] cursor-pointer hover:border-[#00d992]/40 transition-colors"
                >
                  <span className="text-[10px] font-mono text-[#8b949e] uppercase">Scheduled</span>
                  <p className="text-base font-bold text-[#00d992]">{acceptedSessions.length}</p>
                </div>
                <div
                  onClick={() => setActiveTab('questionnaires')}
                  className="p-2 rounded bg-[#101010] border border-[#3d3a39] cursor-pointer hover:border-[#00d992]/40 transition-colors"
                >
                  <span className="text-[10px] font-mono text-[#8b949e] uppercase">Scorecards</span>
                  <p className="text-base font-bold text-[#f2f2f2]">{completedSessions.length}</p>
                </div>
                <div
                  onClick={() => setActiveTab('match')}
                  className="p-2 rounded bg-[#101010] border border-[#3d3a39] cursor-pointer hover:border-[#00d992]/40 transition-colors"
                >
                  <span className="text-[10px] font-mono text-[#8b949e] uppercase">Candidates</span>
                  <p className="text-base font-bold text-[#f2f2f2]">{matchingCandidates.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bento Grid Row 2: Scrollable Active Sessions Pipeline Strip */}
          <div className="rounded-[12px] bg-[#1a1a1a] border border-[#3d3a39] p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#3d3a39]/70 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-[2px] text-[#8b949e]">
                  ACTIVE SESSIONS & PIPELINE ({interviewerSessions.length})
                </span>
                <span className="text-[10px] text-[#8b949e] font-mono">
                  • Scroll horizontally to inspect cards
                </span>
              </div>
              <button
                onClick={() => setActiveTab('sessions')}
                className="text-xs font-semibold text-[#2fd6a1] hover:text-[#00d992] transition-colors cursor-pointer"
              >
                Go to Requests & Sessions Page →
              </button>
            </div>

            {/* Scrollable Container for Sessions */}
            <div className="overflow-x-auto flex gap-4 pb-2 no-scrollbar">
              {interviewerSessions.map((session) => {
                const isPending = session.status === 'pending';
                const isAccepted = session.status === 'accepted';
                const isCompleted = session.status === 'completed';

                return (
                  <div
                    key={session.id}
                    className="min-w-[310px] max-w-[320px] rounded-[10px] bg-[#101010] border border-[#3d3a39] p-4 flex flex-col justify-between space-y-3 hover:border-[#00d992]/40 transition-all flex-shrink-0 shadow-xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={session.candidateAvatar}
                            alt={session.candidateName}
                            className="w-9 h-9 rounded-full border border-[#3d3a39] object-cover flex-shrink-0"
                          />
                          <div>
                            <h4 className="text-xs font-bold text-[#f2f2f2]">
                              {session.candidateName}
                            </h4>
                            <p className="text-[10.5px] text-[#8b949e] truncate max-w-[150px]">
                              {session.candidateRole}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                            isAccepted
                              ? 'bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/40'
                              : isPending
                              ? 'bg-amber-400/15 text-amber-400 border border-amber-400/40'
                              : 'bg-zinc-700/30 text-[#8b949e] border border-zinc-700'
                          }`}
                        >
                          {session.status}
                        </span>
                      </div>

                      <div className="p-2 rounded bg-[#161616] border border-[#3d3a39]/60 space-y-1">
                        <p className="text-xs font-semibold text-[#f2f2f2] truncate">
                          {session.format}
                        </p>
                        <p className="text-[10.5px] text-[#8b949e] font-mono">
                          Slot: {session.scheduledAt}
                        </p>
                      </div>

                      {session.candidateNotes && (
                        <p className="text-[11px] text-[#bdbdbd] line-clamp-2 italic">
                          &ldquo;{session.candidateNotes}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#3d3a39]/70 flex items-center justify-between">
                      {isPending && (
                        <div className="flex items-center gap-2 w-full justify-end">
                          <button
                            onClick={() => handleAcceptRequest(session.id)}
                            className="btn-primary text-[10.5px] px-2.5 py-1 cursor-pointer"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDeclineRequest(session.id)}
                            className="btn-outline text-[10.5px] px-2.5 py-1 text-red-400 hover:text-red-300 cursor-pointer"
                          >
                            Decline
                          </button>
                        </div>
                      )}

                      {isAccepted && (
                        <div className="flex items-center gap-2 w-full justify-between">
                          {session.meetingUrl && (
                            <a
                              href={session.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-primary text-[10.5px] px-2.5 py-1 flex items-center gap-1 cursor-pointer"
                            >
                              <span>⚡ Launch</span>
                            </a>
                          )}
                          <button
                            onClick={() => setEvaluatingSession(session)}
                            className="btn-outline text-[10.5px] px-2.5 py-1 cursor-pointer"
                          >
                            Evaluate
                          </button>
                        </div>
                      )}

                      {isCompleted && session.questionnaire && (
                        <button
                          onClick={() => setViewingScorecardSession(session)}
                          className="btn-primary text-[10.5px] px-3 py-1 w-full cursor-pointer"
                        >
                          ★ View Scorecard
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bento Grid Row 3: Scrollable Candidate Matches Strip */}
          <div className="rounded-[12px] bg-[#1a1a1a] border border-[#3d3a39] p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#3d3a39]/70 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-[2px] text-[#8b949e]">
                  MATCHING CANDIDATES POOL ({matchingCandidates.length})
                </span>
                <span className="text-[10px] text-[#00d992] font-mono">
                  • Calibrated against your bar
                </span>
              </div>
              <button
                onClick={() => setActiveTab('match')}
                className="text-xs font-semibold text-[#2fd6a1] hover:text-[#00d992] transition-colors cursor-pointer"
              >
                Go to Candidate Discovery →
              </button>
            </div>

            {/* Scrollable Container for Candidates */}
            <div className="overflow-x-auto flex gap-4 pb-2 no-scrollbar">
              {matchingCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="min-w-[310px] max-w-[320px] rounded-[10px] bg-[#101010] border border-[#3d3a39] p-4 flex flex-col justify-between space-y-3 hover:border-[#00d992]/40 transition-all flex-shrink-0 shadow-xs"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={candidate.avatar}
                          alt={candidate.name}
                          className="w-10 h-10 rounded-full border border-[#3d3a39] object-cover ring-2 ring-[#00d992]/20 flex-shrink-0"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-[#f2f2f2]">
                            {candidate.name}
                          </h4>
                          <p className="text-[10.5px] text-[#00d992] font-semibold truncate max-w-[140px]">
                            {candidate.currentCompany}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/40">
                        {candidate.compatibilityScore}%
                      </span>
                    </div>

                    <div className="p-2 rounded bg-[#161616] border border-[#3d3a39]/60">
                      <p className="text-[11px] text-[#bdbdbd] font-mono font-medium truncate">
                        Target: {candidate.targetRole}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {candidate.keySkills.slice(0, 3).map((sk) => (
                        <span key={sk} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#121212] border border-[#3d3a39] text-[#bdbdbd]">
                          {sk}
                        </span>
                      ))}
                    </div>

                    <p className="text-[11px] text-[#8b949e] line-clamp-2 leading-relaxed">
                      {candidate.careerGoals}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-[#3d3a39]/70 flex items-center justify-between">
                    <span className="text-[10.5px] font-mono text-[#8b949e]">
                      {candidate.yearsExperience} yrs exp
                    </span>
                    <button
                      onClick={() => setSelectedCandidate(candidate)}
                      className="btn-primary text-[10.5px] px-3 py-1 cursor-pointer"
                    >
                      Invite to Mock
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bento Grid Row 4: Scorecards & Operating Model */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Tile 5: Calibration Scorecards Tile (7 cols) */}
            <div className="lg:col-span-7 rounded-[12px] bg-[#1a1a1a] border border-[#3d3a39] p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#3d3a39]/70 pb-3">
                <span className="text-[11px] font-mono uppercase tracking-[2px] text-[#8b949e]">
                  RECENT CALIBRATION SCORECARDS
                </span>
                <button
                  onClick={() => setActiveTab('questionnaires')}
                  className="text-xs font-semibold text-[#2fd6a1] hover:text-[#00d992] transition-colors cursor-pointer"
                >
                  All Scorecards ({completedSessions.length}) →
                </button>
              </div>

              {completedSessions.length > 0 ? (
                <div className="space-y-3">
                  {completedSessions.slice(0, 2).map((session) => (
                    <div
                      key={session.id}
                      className="p-3.5 rounded-[8px] bg-[#101010] border border-[#3d3a39] space-y-2 hover:border-[#00d992]/40 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-[#f2f2f2]">
                            {session.candidateName} • {session.format}
                          </p>
                          <p className="text-[10.5px] text-[#8b949e] font-mono">
                            Evaluated: {session.questionnaire?.submittedAt ? new Date(session.questionnaire.submittedAt).toLocaleDateString() : 'Recent'}
                          </p>
                        </div>
                        <span className="text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#00d992]/20 text-[#00d992] border border-[#00d992]/40">
                          {session.questionnaire?.overallRecommendation || 'Hire'}
                        </span>
                      </div>

                      {/* Dimension scores pills */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 text-[10.5px] font-mono text-[#bdbdbd]">
                        <span className="bg-[#1a1a1a] p-1 rounded border border-[#3d3a39] text-center">
                          Arch: {session.questionnaire?.systemArchitectureRating}/5
                        </span>
                        <span className="bg-[#1a1a1a] p-1 rounded border border-[#3d3a39] text-center">
                          Depth: {session.questionnaire?.technicalDepthRating}/5
                        </span>
                        <span className="bg-[#1a1a1a] p-1 rounded border border-[#3d3a39] text-center">
                          Problem: {session.questionnaire?.problemSolvingRating}/5
                        </span>
                        <span className="bg-[#1a1a1a] p-1 rounded border border-[#3d3a39] text-center">
                          Comm: {session.questionnaire?.communicationRating}/5
                        </span>
                      </div>

                      {session.questionnaire?.strengths && (
                        <p className="text-[11px] text-[#8b949e] line-clamp-1 italic pt-1">
                          Strengths: &ldquo;{session.questionnaire.strengths}&rdquo;
                        </p>
                      )}

                      <div className="pt-2 border-t border-[#3d3a39]/60 flex justify-end">
                        <button
                          onClick={() => setViewingScorecardSession(session)}
                          className="text-[11px] font-semibold text-[#00d992] hover:text-[#2fd6a1] cursor-pointer"
                        >
                          View Full Scorecard & Rubric →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-[8px] bg-[#101010] border border-[#3d3a39] text-center text-xs text-[#8b949e]">
                  No completed scorecards yet. Sessions completed will automatically appear here.
                </div>
              )}
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
                <button
                  onClick={() => handleOpenEditor('context')}
                  className="btn-outline text-[11px] px-3 py-1 cursor-pointer"
                >
                  ✎ Edit Portfolio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. MY PROFILE SECTION: Unified "Edit Portfolio" Entry
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#3d3a39]">
            <div>
              <h2 className="text-2xl font-normal text-[#f2f2f2] tracking-tight">
                Interviewer Profile & Rubric
              </h2>
              <p className="text-sm text-[#8b949e]">
                Configure your interview philosophy, session formats, evaluation capabilities, and availability.
              </p>
            </div>
            {/* Unified Single Edit Portfolio Button per requirement */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenEditor('context')}
                className="btn-primary text-xs px-4 py-2 cursor-pointer flex items-center gap-2"
              >
                <span>✎</span>
                <span>Edit Portfolio</span>
              </button>
            </div>
          </div>

          {/* Section 1: Philosophy & Formats */}
          <div className="rounded-[12px] bg-[#1a1a1a] border border-[#3d3a39] p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#3d3a39]/70">
              <span className="text-xs font-mono uppercase tracking-[2.52px] text-[#8b949e]">
                01 • INTERVIEW PHILOSOPHY & OPERATING MODEL
              </span>
              <button
                onClick={() => handleOpenEditor('context')}
                className="text-xs font-semibold text-[#2fd6a1] hover:text-[#00d992] cursor-pointer"
              >
                Edit in Portfolio →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-mono text-[#8b949e] uppercase">Headline</span>
                  <p className="text-base text-[#f2f2f2] font-semibold mt-1">
                    {profile.headline}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-mono text-[#8b949e] uppercase">Evaluation Philosophy</span>
                  <p className="text-sm text-[#bdbdbd] mt-1 leading-relaxed">
                    {profile.context.interviewPhilosophy}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-mono text-[#8b949e] uppercase">Domains Assessed</span>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {profile.domains.map((dom) => (
                      <span key={dom} className="pill-tag text-xs font-medium">
                        {dom}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-xs font-mono text-[#8b949e] uppercase">Mock Session Formats Offered</span>
                  <div className="space-y-2 mt-1.5">
                    {profile.context.sessionFormats.map((fmt) => (
                      <div key={fmt} className="p-2.5 rounded-[8px] bg-[#111111] border border-[#3d3a39] text-xs font-medium text-[#f2f2f2]">
                        ✦ {fmt}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-mono text-[#8b949e] uppercase">Availability Schedule</span>
                    <p className="text-xs text-[#f2f2f2] font-mono mt-1">
                      {profile.context.availabilitySchedule}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-mono text-[#8b949e] uppercase">Max Sessions / Wk</span>
                    <p className="text-sm text-[#f2f2f2] font-mono mt-1">
                      {profile.context.maxSessionsPerWeek} sessions
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-mono text-[#8b949e] uppercase">Model / Honorarium</span>
                  <p className="text-xs text-[#00d992] font-mono mt-1">
                    {profile.context.hourlyHonorarium}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Assessment Capabilities Grid */}
          <div className="rounded-[12px] bg-[#1a1a1a] border border-[#3d3a39] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#3d3a39]/70">
              <span className="text-xs font-mono uppercase tracking-[2.52px] text-[#8b949e]">
                02 • SPECIALIZED EVALUATION SKILLS ({profile.skills.length})
              </span>
              <button
                onClick={() => handleOpenEditor('skill')}
                className="text-xs font-semibold text-[#00d992] hover:text-[#2fd6a1] cursor-pointer"
              >
                Manage Capabilities in Portfolio →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profile.skills.map((skill) => (
                <div
                  key={skill.id}
                  className="p-4 rounded-[10px] bg-[#111111] border border-[#3d3a39] flex items-center justify-between group hover:border-[#00d992]/50 transition-colors shadow-xs"
                >
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-[#f2f2f2]">
                      {skill.name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-[#00d992] font-semibold">{skill.level}</span>
                      <span className="text-[#8b949e]">•</span>
                      <span className="text-[#bdbdbd]">{skill.interviewsConducted} mocks held</span>
                      <span className="text-[#8b949e]">•</span>
                      <span className="text-[#8b949e]">{skill.category}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteSkill(skill.id)}
                    className="opacity-0 group-hover:opacity-100 text-[#8b949e] hover:text-red-400 text-xs transition-opacity p-1 cursor-pointer"
                    title="Remove capability"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Track Record & Certifications */}
          <div className="rounded-[12px] bg-[#1a1a1a] border border-[#3d3a39] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#3d3a39]/70">
              <span className="text-xs font-mono uppercase tracking-[2.52px] text-[#8b949e]">
                03 • BAR RAISER CREDENTIALS & TRACK RECORD
              </span>
              <button
                onClick={() => handleOpenEditor('credentials')}
                className="text-xs font-semibold text-[#00d992] hover:text-[#2fd6a1] cursor-pointer"
              >
                Edit Credentials →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-[10px] bg-[#111111] border border-[#3d3a39] shadow-xs">
                <span className="text-xs font-mono text-[#8b949e] uppercase">Primary Company</span>
                <p className="text-base font-semibold text-[#f2f2f2] mt-1">
                  {profile.experience.primaryCompany}
                </p>
                <span className="text-xs text-[#00d992] font-mono">
                  {profile.experience.yearsInterviewing} years active interviewing
                </span>
              </div>

              <div className="p-4 rounded-[10px] bg-[#111111] border border-[#3d3a39] shadow-xs">
                <span className="text-xs font-mono text-[#8b949e] uppercase">Average Peer Rating</span>
                <p className="text-base font-semibold text-amber-300 mt-1">
                  ★ {profile.experience.averageRating} / 5.0
                </p>
                <span className="text-xs text-[#bdbdbd] font-mono">
                  From {profile.experience.totalInterviewsConducted} debriefs
                </span>
              </div>

              <div className="p-4 rounded-[10px] bg-[#111111] border border-[#3d3a39] shadow-xs">
                <span className="text-xs font-mono text-[#8b949e] uppercase">Certifications</span>
                <div className="space-y-1 mt-1">
                  {profile.experience.certifications.map((cert) => (
                    <p key={cert} className="text-xs text-[#00d992] font-mono">
                      ✓ {cert}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. BROWSE MATCHING CANDIDATES TAB
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'match' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#3d3a39]">
            <div>
              <h2 className="text-2xl font-normal text-[#f2f2f2] tracking-tight">
                Candidates Seeking Mocks
              </h2>
              <p className="text-sm text-[#8b949e]">
                Browse matching candidates looking for calibration in your technical areas and offer mock sessions.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#00d992]">
              <span className="w-2 h-2 rounded-full bg-[#00d992] animate-pulse" />
              <span>{filteredCandidates.length} candidates matching rubric</span>
            </div>
          </div>

          {/* Search & Domain Filter Bar */}
          <div className="p-4 rounded-[12px] bg-[#1a1a1a] border border-[#3d3a39] flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
            <div className="w-full md:w-96 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidates by target role, company, or skill..."
                className="w-full bg-[#111111] border border-[#3d3a39] rounded-[8px] pl-3 pr-8 py-2 text-xs text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-[#8b949e] text-xs hover:text-[#f2f2f2]"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
              {['all', 'Consensus', 'Cloud', 'Transactions'].map((domain) => (
                <button
                  key={domain}
                  onClick={() => setSelectedDomain(domain)}
                  className={`px-3 py-1 rounded-full text-xs font-mono transition-all whitespace-nowrap active:scale-[0.95] cursor-pointer ${
                    selectedDomain === domain
                      ? 'bg-[#00d992]/20 text-[#00d992] border border-[#00d992]/40 font-semibold shadow-xs'
                      : 'bg-[#111111] text-[#8b949e] border border-[#3d3a39] hover:text-[#f2f2f2]'
                  }`}
                >
                  {domain === 'all' ? 'All Domains' : domain}
                </button>
              ))}
            </div>
          </div>

          {/* Candidates Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className="rounded-[14px] bg-[#1a1a1a] border border-[#3d3a39] hover:border-[#00d992]/50 transition-all p-6 flex flex-col justify-between space-y-4 shadow-xs"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={candidate.avatar}
                        alt={candidate.name}
                        className="w-14 h-14 rounded-full border border-[#3d3a39] object-cover ring-2 ring-[#00d992]/20 flex-shrink-0"
                      />
                      <div>
                        <h3 className="text-base font-semibold text-[#f2f2f2] tracking-tight">
                          {candidate.name}
                        </h3>
                        <p className="text-xs text-[#00d992] font-semibold">
                          Target: {candidate.targetRole}
                        </p>
                        <p className="text-xs text-[#8b949e] font-mono mt-0.5">
                          Currently at {candidate.currentCompany} • {candidate.yearsExperience} yrs exp
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/50 flex-shrink-0 shadow-xs">
                      {candidate.compatibilityScore}% MATCH
                    </span>
                  </div>

                  <div className="p-3 rounded-[8px] bg-[#111111] border border-[#3d3a39] text-xs text-[#bdbdbd] shadow-xs">
                    <span className="font-mono text-[#00d992] font-semibold mr-1.5">
                      Rubric Fit:
                    </span>
                    {candidate.compatibilityReason}
                  </div>

                  <p className="text-xs text-[#8b949e] leading-relaxed">
                    Goal: &ldquo;{candidate.careerGoals}&rdquo;
                  </p>

                  <div className="space-y-2 pt-2 border-t border-[#3d3a39]/70">
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.keySkills.map((sk) => (
                        <span key={sk} className="pill-tag text-[11px]">
                          {sk}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-[#8b949e]">
                      <span className="text-[#00d992]">Preferred Format:</span>
                      <span>{candidate.preferredFormat}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#3d3a39]/70 flex items-center justify-between">
                  <span className="text-xs text-[#8b949e] font-mono">
                    Ready to Practice
                  </span>
                  <button
                    onClick={() => setSelectedCandidate(candidate)}
                    className="btn-primary text-xs px-4 py-2 cursor-pointer"
                  >
                    Invite to Mock Session
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          4. REQUESTS & SESSIONS TAB
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#3d3a39]">
            <div>
              <h2 className="text-2xl font-normal text-[#f2f2f2] tracking-tight">
                Incoming Requests & Sessions
              </h2>
              <p className="text-sm text-[#8b949e]">
                Accept incoming requests from candidates, manage scheduled sessions, and fill post-interview scorecards.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {(['all', 'pending', 'accepted', 'completed'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSessionsFilter(filter)}
                  className={`px-3 py-1 rounded-[8px] text-xs font-mono uppercase tracking-wider transition-all active:scale-[0.95] cursor-pointer ${
                    sessionsFilter === filter
                      ? 'bg-[#1e1e1e] text-[#00d992] border border-[#00d992]/40 font-semibold shadow-xs'
                      : 'text-[#8b949e] hover:text-[#f2f2f2]'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="rounded-[14px] bg-[#1a1a1a] border border-[#3d3a39] p-12 text-center space-y-3">
              <div className="text-3xl">🎙️</div>
              <h3 className="text-base font-semibold text-[#f2f2f2]">
                No sessions found under this filter
              </h3>
              <p className="text-xs text-[#8b949e] max-w-md mx-auto">
                Candidates will appear here when they request mock interviews with you, or you can invite matching candidates.
              </p>
              <button
                onClick={() => setActiveTab('match')}
                className="btn-primary text-xs px-4 py-2 mt-2 cursor-pointer"
              >
                Browse Candidates
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSessions.map((session) => {
                const isPending = session.status === 'pending';
                const isAccepted = session.status === 'accepted';
                const isCompleted = session.status === 'completed';

                return (
                  <div
                    key={session.id}
                    className="p-5 rounded-[12px] bg-[#1a1a1a] border border-[#3d3a39] space-y-4 shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={session.candidateAvatar}
                          alt={session.candidateName}
                          className="w-12 h-12 rounded-full border border-[#3d3a39] object-cover ring-2 ring-[#00d992]/20 flex-shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-semibold text-[#f2f2f2]">
                              {session.format}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                                isAccepted
                                  ? 'bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/40 shadow-xs'
                                  : isPending
                                  ? 'bg-amber-400/15 text-amber-400 border border-amber-400/40 shadow-xs'
                                  : 'bg-zinc-700/30 text-[#8b949e] border border-zinc-700'
                              }`}
                            >
                              {session.status}
                            </span>
                          </div>
                          <p className="text-xs text-[#bdbdbd] mt-0.5">
                            Candidate: {session.candidateName} • {session.candidateRole}
                          </p>
                          <p className="text-xs text-[#8b949e] font-mono mt-0.5">
                            Slot: {session.scheduledAt}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {isPending && (
                          <>
                            <button
                              onClick={() => handleAcceptRequest(session.id)}
                              className="btn-primary text-xs px-3.5 py-1.5 cursor-pointer"
                            >
                              Accept Request
                            </button>
                            <button
                              onClick={() => handleDeclineRequest(session.id)}
                              className="btn-outline text-xs px-3 py-1.5 text-red-400 hover:text-red-300 cursor-pointer"
                            >
                              Decline
                            </button>
                          </>
                        )}

                        {isAccepted && (
                          <>
                            {session.meetingUrl && (
                              <a
                                href={session.meetingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 cursor-pointer"
                              >
                                <span>⚡ Launch Room</span>
                              </a>
                            )}
                            <button
                              onClick={() => setEvaluatingSession(session)}
                              className="btn-outline text-xs px-3.5 py-1.5 cursor-pointer"
                            >
                              Complete & Evaluate
                            </button>
                          </>
                        )}

                        {isCompleted && session.questionnaire && (
                          <button
                            onClick={() => setViewingScorecardSession(session)}
                            className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>★ View Submitted Scorecard</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {session.candidateNotes && (
                      <div className="p-3 rounded-[8px] bg-[#111111] border border-[#3d3a39] text-xs text-[#8b949e]">
                        <span className="font-mono text-[#bdbdbd] font-semibold mr-1.5">
                          Candidate Focus:
                        </span>
                        {session.candidateNotes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          5. POST-INTERVIEW QUESTIONNAIRES TAB
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'questionnaires' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#3d3a39]">
            <div>
              <h2 className="text-2xl font-normal text-[#f2f2f2] tracking-tight">
                Post-Interview Questionnaires & Calibration
              </h2>
              <p className="text-sm text-[#8b949e]">
                Complete rubrics, score dimensions, and submit hiring committee recommendations for mock sessions.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {interviewerSessions.map((session) => {
              const hasScorecard = Boolean(session.questionnaire);

              return (
                <div
                  key={session.id}
                  className="p-5 rounded-[12px] bg-[#1a1a1a] border border-[#3d3a39] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#f2f2f2]">
                        {session.format}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          hasScorecard
                            ? 'bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/40 shadow-xs'
                            : 'bg-amber-400/15 text-amber-400 border border-amber-400/40 shadow-xs'
                        }`}
                      >
                        {hasScorecard ? 'SCORECARD SUBMITTED' : 'EVALUATION PENDING'}
                      </span>
                    </div>

                    <p className="text-xs text-[#bdbdbd] mt-0.5">
                      Candidate: {session.candidateName} • {session.candidateRole}
                    </p>

                    {session.questionnaire && (
                      <div className="flex items-center gap-3 mt-2 text-xs font-mono text-[#8b949e]">
                        <span className="text-[#00d992] font-bold">
                          Rec: {session.questionnaire.overallRecommendation}
                        </span>
                        <span>•</span>
                        <span>Architecture: {session.questionnaire.systemArchitectureRating}/5</span>
                        <span>•</span>
                        <span>Depth: {session.questionnaire.technicalDepthRating}/5</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    {hasScorecard ? (
                      <button
                        onClick={() => setViewingScorecardSession(session)}
                        className="btn-outline text-xs px-3.5 py-1.5 cursor-pointer"
                      >
                        Review Scorecard
                      </button>
                    ) : (
                      <button
                        onClick={() => setEvaluatingSession(session)}
                        className="btn-primary text-xs px-3.5 py-1.5 cursor-pointer"
                      >
                        Fill Questionnaire
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Invite Candidate */}
      {selectedCandidate && (
        <InviteCandidateModal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
        />
      )}

      {/* Modal: Interviewer Profile Editor */}
      {isEditorOpen && (
        <InterviewerProfileEditorModal
          initialSection={editorSection}
          onClose={() => setIsEditorOpen(false)}
        />
      )}

      {/* Modal: Fill Questionnaire */}
      {evaluatingSession && (
        <QuestionnaireModal
          session={evaluatingSession}
          onClose={() => setEvaluatingSession(null)}
        />
      )}

      {/* Modal: View Scorecard */}
      {viewingScorecardSession && (
        <ViewQuestionnaireModal
          session={viewingScorecardSession}
          onClose={() => setViewingScorecardSession(null)}
        />
      )}
    </div>
  );
}
