'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  recoverAllUnfinalizedRecordings,
  listRecordings,
  RecordingMetadata,
} from '@/lib/opfs/recording-storage';
import { InterviewReviewModal } from './interview-review-modal';

export interface DashboardInterviewItem {
  id: string;
  title: string;
  status: string;
  role?: string;
  date?: string;
}

interface DashboardInterviewsProps {
  initialInterviews?: DashboardInterviewItem[];
}

export function DashboardInterviews({
  initialInterviews = [],
}: DashboardInterviewsProps) {
  const [recordingsMap, setRecordingsMap] = useState<Record<string, RecordingMetadata>>({});
  const [activeReviewInterview, setActiveReviewInterview] = useState<DashboardInterviewItem | null>(
    null
  );
  const [isRecovering, setIsRecovering] = useState<boolean>(true);

  const refreshRecordings = useCallback(async () => {
    try {
      // 1. Silently auto-recover unfinalized recordings from unexpected tab crashes
      await recoverAllUnfinalizedRecordings();

      // 2. Fetch all local recordings
      const records = await listRecordings();
      const map: Record<string, RecordingMetadata> = {};
      records.forEach((rec) => {
        map[rec.interviewId] = rec;
      });
      setRecordingsMap(map);
    } catch (err) {
      console.error('Failed to load local interview recordings:', err);
    } finally {
      setIsRecovering(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        await recoverAllUnfinalizedRecordings();
        const records = await listRecordings();
        if (active) {
          const map: Record<string, RecordingMetadata> = {};
          records.forEach((rec) => {
            map[rec.interviewId] = rec;
          });
          setRecordingsMap(map);
          setIsRecovering(false);
        }
      } catch (err) {
        console.error('Failed to load local interview recordings:', err);
        if (active) setIsRecovering(false);
      }
    }
    init();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-[#3d3a39] pb-3">
        <div>
          <h2 className="text-base font-semibold text-[#f2f2f2]">Your Interviews</h2>
          <p className="text-xs text-[#8b949e]">
            Review your mock interviews, playback local recordings, and inspect transcripts.
          </p>
        </div>
        {isRecovering && (
          <span className="text-xs text-[#8b949e] font-mono animate-pulse">
            Checking local recordings...
          </span>
        )}
      </div>

      {initialInterviews.length === 0 ? (
        <div className="rounded-lg border border-[#3d3a39] bg-[#1a1a1a] p-6 text-center text-sm text-[#8b949e]">
          No interview sessions found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {initialInterviews.map((interview) => {
            const localRec = recordingsMap[interview.id];
            const hasRecording = Boolean(localRec);

            return (
              <div
                key={interview.id}
                className="rounded-lg border border-[#3d3a39] bg-[#1a1a1a] p-4 flex flex-col justify-between space-y-4 hover:border-[#8b949e]/40 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#8b949e]">
                      {interview.role ? `Role: ${interview.role}` : `ID: ${interview.id.slice(0, 8)}`}
                    </span>
                    {hasRecording && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00d992]/10 border border-[#00d992]/30 px-2.5 py-0.5 text-[11px] font-medium text-[#00d992]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#00d992]" />
                        Local Recording Ready
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-[#f2f2f2]">{interview.title}</h3>
                  {interview.date && (
                    <p className="text-xs text-[#8b949e]">{interview.date}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#3d3a39]/60">
                  <span className="text-xs text-[#bdbdbd] capitalize">
                    Status: {interview.status}
                  </span>

                  {hasRecording ? (
                    <button
                      type="button"
                      onClick={() => setActiveReviewInterview(interview)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#00d992] hover:bg-[#2fd6a1] px-3 py-1.5 text-xs font-semibold text-[#101010] transition-colors shadow-sm"
                    >
                      <span>▶</span>
                      <span>Review Recording</span>
                    </button>
                  ) : (
                    <a
                      href={`/room/${interview.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-[#3d3a39] bg-[#101010] hover:bg-[#2a2a2a] px-3 py-1.5 text-xs font-medium text-[#f2f2f2] transition-colors"
                    >
                      Enter Room
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Review Modal with OPFS Video Player & Whisper Transcription */}
      {activeReviewInterview && (
        <InterviewReviewModal
          isOpen={Boolean(activeReviewInterview)}
          interviewId={activeReviewInterview.id}
          interviewTitle={activeReviewInterview.title}
          onClose={() => setActiveReviewInterview(null)}
          onDeleted={() => {
            setActiveReviewInterview(null);
            refreshRecordings();
          }}
        />
      )}
    </div>
  );
}
