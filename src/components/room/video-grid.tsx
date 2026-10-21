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

  const hasRemoteVideo = Boolean(
    remoteStream && remoteStream.getVideoTracks().some((t) => t.enabled)
  );

  // Attach local stream and ensure playback when active
  useEffect(() => {
    const video = localVideoRef.current;
    if (video && localStream) {
      if (video.srcObject !== localStream) {
        video.srcObject = localStream;
      }
      if (!isCameraOff) {
        const playPromise = video.play();
        if (playPromise !== undefined && typeof playPromise?.catch === 'function') {
          playPromise.catch(() => {});
        }
      }
    }
  }, [localStream, isCameraOff]);

  // Attach remote stream and ensure playback
  useEffect(() => {
    const video = remoteVideoRef.current;
    if (video && remoteStream) {
      if (video.srcObject !== remoteStream) {
        video.srcObject = remoteStream;
      }
      const playPromise = video.play();
      if (playPromise !== undefined && typeof playPromise?.catch === 'function') {
        playPromise.catch(() => {});
      }
    }
  }, [remoteStream, hasRemoteVideo]);

  return (
    <div className="flex-1 w-full p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-center min-h-[400px]">
      {/* Remote Participant Tile */}
      <div className="relative w-full h-full min-h-[260px] sm:min-h-[360px] bg-[#1a1a1a] border border-[#3d3a39] rounded-xl overflow-hidden flex items-center justify-center shadow-lg">
        {/* Persistently mounted remote video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover ${
            hasRemoteVideo ? 'block' : 'hidden'
          }`}
        />

        {/* Remote Camera Off / Connecting Placeholder */}
        {!hasRemoteVideo && (
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
        {/* Persistently mounted local video */}
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover scale-x-[-1] ${
            !isCameraOff && localStream ? 'block' : 'hidden'
          }`}
        />

        {/* Local Camera Off Placeholder */}
        {(isCameraOff || !localStream) && (
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
