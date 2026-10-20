'use client';

import React from 'react';
import { RoomParticipant } from '@/types/interview';

interface RoomHeaderProps {
  title: string;
  interviewId: string;
  currentRole: 'candidate' | 'interviewer';
  peerProfile: RoomParticipant | null;
  isRecording: boolean;
  recordingDuration: number;
  uploadedChunksCount: number;
}

function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function RoomHeader({
  title,
  interviewId,
  currentRole,
  peerProfile,
  isRecording,
  recordingDuration,
  uploadedChunksCount,
}: RoomHeaderProps) {
  return (
    <header className="w-full bg-[#101010] border-b border-[#3d3a39] px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-4 select-none">
      {/* Left: Title & ID */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-mono tracking-wider text-[#8b949e]">
              Room • {interviewId.slice(0, 8)}
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00d992]" />
          </div>
          <h1 className="text-sm sm:text-base font-semibold text-[#f2f2f2]">{title}</h1>
        </div>
      </div>

      {/* Center: Recording Indicator & Duration */}
      <div className="flex items-center gap-3">
        {isRecording ? (
          <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#ff4d4f]/40 px-3 py-1.5 rounded-full">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff4d4f] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ff4d4f]" />
            </span>
            <span className="text-xs font-semibold text-[#ff4d4f] uppercase tracking-wide">
              REC
            </span>
            <span className="text-xs font-mono text-[#f2f2f2] pl-1 border-l border-[#3d3a39]">
              {formatTimer(recordingDuration)}
            </span>
            {uploadedChunksCount > 0 && (
              <span className="text-[11px] text-[#8b949e] font-mono hidden md:inline">
                ({uploadedChunksCount} streamed)
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#3d3a39] px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-[#8b949e]" />
            <span className="text-xs text-[#8b949e]">Connecting Audio...</span>
          </div>
        )}
      </div>

      {/* Right: Participants Presence */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-[#1a1a1a] border border-[#3d3a39] px-2.5 py-1 rounded-md text-xs">
          <span className="text-[#8b949e]">You:</span>
          <span className="font-medium capitalize text-[#00d992]">{currentRole}</span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#1a1a1a] border border-[#3d3a39] px-2.5 py-1 rounded-md text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              peerProfile ? 'bg-[#00d992]' : 'bg-[#ffaa00] animate-pulse'
            }`}
          />
          <span className="text-[#f2f2f2]">
            {peerProfile ? (
              <span className="capitalize">{peerProfile.role}</span>
            ) : (
              <span className="text-[#8b949e]">Waiting for partner...</span>
            )}
          </span>
        </div>
      </div>
    </header>
  );
}
