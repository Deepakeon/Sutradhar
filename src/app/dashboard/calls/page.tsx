'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { InterviewSession } from '@/types';
import { QuestionnaireModal } from '@/components/user/QuestionnaireModal';
import { ViewQuestionnaireModal } from '@/components/common/ViewQuestionnaireModal';

export default function CallsPage() {
  const { currentUser, sessions, updateSessionStatus } = useApp();

  const [sessionsFilter, setSessionsFilter] = useState<'all' | 'pending' | 'accepted' | 'completed'>('all');
  const [evaluatingSession, setEvaluatingSession] = useState<InterviewSession | null>(null);
  const [viewingScorecardSession, setViewingScorecardSession] = useState<InterviewSession | null>(null);

  const userSessions = sessions.filter((s) => s.interviewerId === currentUser.id);

  const filteredSessions = userSessions.filter((s) => {
    if (sessionsFilter === 'all') return true;
    return s.status === sessionsFilter;
  });

  const handleAcceptRequest = (sessionId: string) => {
    updateSessionStatus(sessionId, 'accepted');
  };

  const handleDeclineRequest = (sessionId: string) => {
    updateSessionStatus(sessionId, 'declined');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#3d3a39]">
        <div>
          <h2 className="text-2xl font-normal text-[#f2f2f2] tracking-tight">
            Incoming Requests & Mock Calls
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
          <Link
            href="/dashboard/interviews"
            className="inline-flex items-center justify-center font-semibold rounded-[6px] bg-[#00d992] text-[#101010] hover:bg-[#2fd6a1] transition-all text-xs px-4 py-2 mt-2 cursor-pointer"
          >
            Browse Interviews
          </Link>
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
                          className="inline-flex items-center justify-center font-semibold rounded-[6px] bg-[#00d992] text-[#101010] hover:bg-[#2fd6a1] transition-all text-xs px-3.5 py-1.5 cursor-pointer"
                        >
                          Accept Request
                        </button>
                        <button
                          onClick={() => handleDeclineRequest(session.id)}
                          className="inline-flex items-center justify-center font-semibold rounded-[6px] border border-[#3d3a39] bg-[#101010] text-[#f2f2f2] hover:border-red-500/40 hover:bg-[#1a1a1a] transition-all text-xs px-3 py-1.5 text-red-400 hover:text-red-300 cursor-pointer"
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
                            className="inline-flex items-center justify-center font-semibold rounded-[6px] bg-[#00d992] text-[#101010] hover:bg-[#2fd6a1] transition-all text-xs px-3.5 py-1.5 flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>⚡ Launch Room</span>
                          </a>
                        )}
                        <button
                          onClick={() => setEvaluatingSession(session)}
                          className="inline-flex items-center justify-center font-semibold rounded-[6px] border border-[#3d3a39] bg-[#101010] text-[#f2f2f2] hover:border-[#8b949e] hover:bg-[#1a1a1a] transition-all text-xs px-3.5 py-1.5 cursor-pointer"
                        >
                          Complete & Evaluate
                        </button>
                      </>
                    )}

                    {isCompleted && session.questionnaire && (
                      <button
                        onClick={() => setViewingScorecardSession(session)}
                        className="inline-flex items-center justify-center font-semibold rounded-[6px] bg-[#00d992] text-[#101010] hover:bg-[#2fd6a1] transition-all text-xs px-3.5 py-1.5 flex items-center gap-1.5 cursor-pointer"
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
