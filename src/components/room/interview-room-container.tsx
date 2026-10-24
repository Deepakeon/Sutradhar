'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { RoomParticipant, InterviewRow } from '@/types/interview';
import { useWebRTC } from '@/hooks/use-webrtc';
import { useAudioStreamer } from '@/hooks/use-audio-streamer';
import { RoomHeader } from './room-header';
import { VideoGrid } from './video-grid';
import { MediaControls } from './media-controls';
import { DeviceSettingsModal } from './device-settings-modal';

interface InterviewRoomContainerProps {
  interviewId: string;
}

export function InterviewRoomContainer({ interviewId }: InterviewRoomContainerProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interview, setInterview] = useState<InterviewRow | null>(null);
  const [currentProfile, setCurrentProfile] = useState<RoomParticipant | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [callEndedState, setCallEndedState] = useState<{
    ended: boolean;
    masterUrl: string | null;
    isFinalizing: boolean;
  }>({
    ended: false,
    masterUrl: null,
    isFinalizing: false,
  });

  // Verify Profile Authentication and Interview Authorization
  useEffect(() => {
    async function loadSession() {
      try {
        setLoading(true);
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          router.push(`/login?next=/room/${interviewId}`);
          return;
        }

        const { data: interviewData, error: dbError } = await supabase
          .schema('private')
          .from('interviews')
          .select('*')
          .eq('id', interviewId)
          .single();

        if (dbError || !interviewData) {
          setError('Interview session not found or invalid meeting link.');
          setLoading(false);
          return;
        }

        const isCandidate = interviewData.candidate_id === user.id;
        const isInterviewer = interviewData.interviewer_id === user.id;

        if (!isCandidate && !isInterviewer) {
          setError('Access Denied: You are not an authorized participant for this interview.');
          setLoading(false);
          return;
        }

        const role = isInterviewer ? 'interviewer' : 'candidate';
        setCurrentProfile({
          id: user.id,
          role,
          name: user.user_metadata?.full_name || role,
        });

        setInterview(interviewData);
        setLoading(false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to initialize interview room';
        setError(message);
        setLoading(false);
      }
    }

    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId]);

  // Hook 1: WebRTC Real-Time Calling
  const {
    localStream,
    remoteStream,
    connectionState,
    isMicMuted,
    isCameraOff,
    peerProfile,
    devices,
    error: rtcError,
    toggleMic,
    toggleCamera,
    switchDevice,
    endCall: executeEndCall,
  } = useWebRTC({
    interviewId,
    currentProfile: currentProfile || { id: '', role: 'candidate' },
    onCallEnded: () => {
      handleWrapUp();
    },
  });

  // Hook 2: Dual-Party 10s Cloudinary Audio Ingestion
  const {
    isRecording,
    recordingDuration,
    uploadedChunksCount,
    finalizeRecording,
  } = useAudioStreamer({
    interviewId,
    profileId: currentProfile?.id,
    localStream,
    isCallActive: connectionState === 'connected',
    role: currentProfile?.role || 'candidate',
    sessionStartedAt: interview?.session_started_at,
  });

  // Handle Call Wrap-up & Finalization
  const handleWrapUp = useCallback(async () => {
    setCallEndedState((prev) => ({ ...prev, ended: true, isFinalizing: true }));

    try {
      const masterUrl = await finalizeRecording();
      setCallEndedState({
        ended: true,
        masterUrl,
        isFinalizing: false,
      });
    } catch {
      setCallEndedState({
        ended: true,
        masterUrl: null,
        isFinalizing: false,
      });
    }
  }, [finalizeRecording]);

  const onUserTriggeredEndCall = useCallback(() => {
    executeEndCall();
    handleWrapUp();
  }, [executeEndCall, handleWrapUp]);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#101010] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#00d992] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-mono text-[#8b949e]">Connecting to Interview Room...</p>
        </div>
      </div>
    );
  }

  // Error / Unauthorized State
  if (error || !currentProfile) {
    return (
      <div className="min-h-screen bg-[#101010] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#1a1a1a] border border-[#ff4d4f]/40 rounded-xl p-6 shadow-xl text-center">
          <div className="w-12 h-12 rounded-full bg-[#ff4d4f]/20 text-[#ff4d4f] flex items-center justify-center mx-auto mb-4 text-xl font-bold">
            !
          </div>
          <h2 className="text-lg font-semibold text-[#f2f2f2] mb-2">Access Restricted</h2>
          <p className="text-sm text-[#8b949e] mb-6">{error || 'Unable to join call room'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-[#00d992] hover:bg-[#2fd6a1] text-[#101010] font-semibold text-sm py-2.5 rounded-lg transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Post-Call Wrap-up Screen
  if (callEndedState.ended) {
    return (
      <div className="min-h-screen bg-[#101010] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-xl p-6 sm:p-8 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-[#00d992]/20 text-[#00d992] flex items-center justify-center mx-auto mb-4 text-xl">
            ✓
          </div>
          <h2 className="text-xl font-bold text-[#f2f2f2] mb-2">Interview Session Concluded</h2>
          <p className="text-sm text-[#8b949e] mb-6">
            The session has ended. All audio chunks were securely streamed to Cloudinary.
          </p>

          <div className="bg-[#101010] border border-[#3d3a39] rounded-lg p-4 mb-6 text-left text-xs font-mono space-y-2">
            <div className="flex justify-between">
              <span className="text-[#8b949e]">Status:</span>
              <span className="text-[#00d992] uppercase font-bold">Completed</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8b949e]">Audio Chunks:</span>
              <span className="text-[#f2f2f2]">{uploadedChunksCount} uploaded</span>
            </div>
            {callEndedState.isFinalizing ? (
              <div className="flex items-center gap-2 text-[#ffaa00] pt-1">
                <span className="w-2 h-2 rounded-full bg-[#ffaa00] animate-ping" />
                <span>Assembling master recording...</span>
              </div>
            ) : callEndedState.masterUrl ? (
              <div className="pt-2 border-t border-[#3d3a39]">
                <span className="text-[#8b949e] block mb-1">Master Recording:</span>
                <a
                  href={callEndedState.masterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00d992] hover:underline break-all"
                >
                  Listen to Recording ↗
                </a>
              </div>
            ) : null}
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-[#00d992] hover:bg-[#2fd6a1] text-[#101010] font-semibold text-sm py-2.5 rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Active Call Screen
  return (
    <div className="min-h-screen bg-[#101010] flex flex-col justify-between overflow-hidden">
      {/* Header */}
      <RoomHeader
        title={interview?.title || 'Technical Interview'}
        interviewId={interviewId}
        currentRole={currentProfile.role}
        peerProfile={peerProfile}
        isRecording={isRecording}
        recordingDuration={recordingDuration}
        uploadedChunksCount={uploadedChunksCount}
      />

      {/* Main Video Stage */}
      <main className="flex-1 flex flex-col justify-center items-center overflow-hidden">
        {rtcError && (
          <div className="w-full max-w-lg mx-auto my-2 px-4 py-2 bg-[#ff4d4f]/10 border border-[#ff4d4f]/30 rounded-md text-[#ff4d4f] text-xs text-center">
            {rtcError}
          </div>
        )}
        <VideoGrid
          localStream={localStream}
          remoteStream={remoteStream}
          currentRole={currentProfile.role}
          peerProfile={peerProfile}
          isMicMuted={isMicMuted}
          isCameraOff={isCameraOff}
        />
      </main>

      {/* Controls Toolbar */}
      <MediaControls
        isMicMuted={isMicMuted}
        isCameraOff={isCameraOff}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCamera}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onEndCall={onUserTriggeredEndCall}
      />

      {/* Settings Modal */}
      <DeviceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        devices={devices}
        onDeviceChange={switchDevice}
      />
    </div>
  );
}
