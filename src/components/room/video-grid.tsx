'use client';

import React, { useRef, useEffect } from 'react';
import { RoomParticipant } from '@/types/interview';

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  currentRole: 'candidate' | 'interviewer';
  peerProfile: RoomParticipant | null;
  isMicMuted: boolean;
  isCameraOff: boolean;
}

export function VideoGrid({
  localStream,
  remoteStream,
  currentRole,
  peerProfile,
  isMicMuted,
  isCameraOff,
}: VideoGridProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className="flex-1 w-full p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-center min-h-[400px]">
      {/* Remote Participant Tile */}
      <div className="relative w-full h-full min-h-[260px] sm:min-h-[360px] bg-[#1a1a1a] border border-[#3d3a39] rounded-xl overflow-hidden flex items-center justify-center shadow-lg">
        {remoteStream && remoteStream.getVideoTracks().some((t) => t.enabled) ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-[#101010] border border-[#3d3a39] flex items-center justify-center text-2xl font-bold text-[#00d992]">
              {peerProfile?.role ? peerProfile.role[0].toUpperCase() : '?'}
            </div>
            <p className="text-sm font-medium text-[#8b949e]">
              {peerProfile ? (
                <>
                  <span className="capitalize">{peerProfile.role}</span> (Camera Off)
                </>
              ) : (
                'Connecting partner stream...'
              )}
            </p>
          </div>
        )}

        {/* Remote Overlay Label */}
        <div className="absolute bottom-3 left-3 bg-[#101010]/80 backdrop-blur-md border border-[#3d3a39] px-3 py-1 rounded-md flex items-center gap-2">
          <span className="text-xs font-medium text-[#f2f2f2] capitalize">
            {peerProfile?.role || 'Interview Partner'}
          </span>
        </div>
      </div>

      {/* Local Participant Tile */}
      <div className="relative w-full h-full min-h-[260px] sm:min-h-[360px] bg-[#1a1a1a] border border-[#3d3a39] rounded-xl overflow-hidden flex items-center justify-center shadow-lg">
        {!isCameraOff && localStream ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-[#101010] border border-[#3d3a39] flex items-center justify-center text-2xl font-bold text-[#f2f2f2]">
              {currentRole[0].toUpperCase()}
            </div>
            <p className="text-sm font-medium text-[#8b949e]">
              You (<span className="capitalize">{currentRole}</span>) - Camera Off
            </p>
          </div>
        )}

        {/* Local Overlay Label */}
        <div className="absolute bottom-3 left-3 bg-[#101010]/80 backdrop-blur-md border border-[#3d3a39] px-3 py-1 rounded-md flex items-center gap-2">
          <span className="text-xs font-medium text-[#f2f2f2] capitalize">
            You ({currentRole})
          </span>
          {isMicMuted && (
            <span className="text-[10px] bg-[#ff4d4f]/20 text-[#ff4d4f] border border-[#ff4d4f]/40 px-1.5 py-0.5 rounded font-mono">
              MUTED
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
