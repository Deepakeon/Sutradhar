'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RoomParticipant } from '@/types/interview';
import { VideoTile } from './video-tile';
import { VideoAvatarFallback } from './video-avatar-fallback';
import { VideoBadge } from './video-badge';
import { AutoplayBanner } from './autoplay-banner';

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
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const hasRemoteVideo = Boolean(
    remoteStream && remoteStream.getVideoTracks().some((t) => t.enabled)
  );

  const unlockAudio = useCallback(() => {
    setAutoplayBlocked(false);
  }, []);

  useEffect(() => {
    if (!autoplayBlocked) return;
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, [autoplayBlocked, unlockAudio]);

  return (
    <div className="flex-1 w-full p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-center min-h-[400px]">
      {/* Remote Participant Tile */}
      <VideoTile
        stream={remoteStream}
        isVideoOff={!hasRemoteVideo}
        onClick={unlockAudio}
        onPlaySuccess={() => setAutoplayBlocked(false)}
        onPlayError={() => setAutoplayBlocked(true)}
        fallback={
          <VideoAvatarFallback
            initial={peerProfile?.role ? peerProfile.role[0] : '?'}
            label={
              peerProfile ? (
                <>
                  <span className="capitalize">{peerProfile.role}</span> (Camera Off)
                </>
              ) : (
                'Connecting partner stream...'
              )
            }
            accent="primary"
          />
        }
        badge={<VideoBadge label={peerProfile?.role || 'Interview Partner'} />}
        banner={autoplayBlocked ? <AutoplayBanner onUnlock={unlockAudio} /> : null}
      />

      {/* Local Participant Tile */}
      <VideoTile
        stream={localStream}
        isVideoOff={isCameraOff || !localStream}
        mirrored
        muted
        fallback={
          <VideoAvatarFallback
            initial={currentRole[0]}
            label={
              <>
                You (<span className="capitalize">{currentRole}</span>) - Camera Off
              </>
            }
            accent="neutral"
          />
        }
        badge={<VideoBadge label={`You (${currentRole})`} isMuted={isMicMuted} />}
      />
    </div>
  );
}
