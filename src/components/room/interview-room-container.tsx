'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { RoomParticipant, InterviewRow } from '@/types/interview';
import { useWebRTC } from '@/hooks/use-webrtc';
import { useAudioStreamer } from '@/hooks/use-audio-streamer';
import { VideoGrid } from './video-grid';
import { MediaControls } from './media-controls';
import { RoomLoading } from './room-loading';
import { RoomError } from './room-error';
import { RoomCallEnded } from './room-call-ended';

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
  const [callEndedState, setCallEndedState] = useState<{
    ended: boolean;
    masterUrl: string | null;
    isFinalizing: boolean;
  }>({
    ended: false,
    masterUrl: null,
    isFinalizing: false,
  });

  useEffect(() => {
    async function loadSession() {
      try {
        setLoading(true);
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          // router.push(`/login?next=/room/${interviewId}`);
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

        // Anchor session_started_at in private.interviews if this is the first participant entering
        if (!interviewData.session_started_at) {
          const nowIso = new Date().toISOString();
          try {
            const { data: updatedInterview } = await supabase
              .schema('private')
              .from('interviews')
              .update({
                session_started_at: nowIso,
                updated_at: nowIso,
              })
              .eq('id', interviewId)
              .is('session_started_at', null)
              .select()
              .single();

            if (updatedInterview?.session_started_at) {
              interviewData.session_started_at = updatedInterview.session_started_at;
            } else {
              interviewData.session_started_at = nowIso;
            }
          } catch {
            interviewData.session_started_at = nowIso;
          }
        }

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

  // Subscribe to changes on interview session (e.g. session_started_at synchronization)
  useEffect(() => {
    if (!interviewId) return;

    const channel = supabase
      .channel(`interview-session:${interviewId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'private',
          table: 'interviews',
          filter: `id=eq.${interviewId}`,
        },
        (payload) => {
          if (payload.new && (payload.new as InterviewRow).session_started_at) {
            setInterview((prev) =>
              prev
                ? {
                    ...prev,
                    session_started_at: (payload.new as InterviewRow).session_started_at,
                  }
                : (payload.new as InterviewRow)
            );
          }
        }
      )
      .subscribe((_status) => {});

    return () => {
      supabase.removeChannel(channel);
    };
  }, [interviewId, supabase]);

  // Hook 1: WebRTC Real-Time Calling
  const {
    localStream,
    remoteStream,
    connectionState,
    isMicMuted,
    isCameraOff,
    peerProfile,
    error: rtcError,
    toggleMic,
    toggleCamera,
    endCall: executeEndCall,
  } = useWebRTC({
    interviewId,
    currentProfile: currentProfile || { id: '', role: 'candidate' },
    onCallEnded: () => {
      handleWrapUp();
    },
  });

  const isRoomActive = !callEndedState.ended && Boolean(currentProfile) && Boolean(localStream);

  const {
    isRecording,
    recordingDuration,
    uploadedChunksCount,
    finalizeRecording,
  } = useAudioStreamer({
    interviewId,
    profileId: currentProfile?.id,
    localStream,
    isCallActive: isRoomActive,
    role: currentProfile?.role || 'candidate',
    sessionStartedAt: interview?.session_started_at,
  });

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

  // if (loading) {
  //   return <RoomLoading />;
  // }

  // if (error || !currentProfile) {
  //   return (
  //     <RoomError
  //       title="Access Restricted"
  //       message={error || 'Unable to join call room'}
  //       action={{
  //         label: "Return to Dashboard",
  //         onAction: () => router.push('/dashboard')
  //       }}
  //     />
  //   );
  // }

  // if (callEndedState.ended) {
  //   return (
  //     <RoomCallEnded
  //       isFinalizing={callEndedState.isFinalizing}
  //       masterUrl={callEndedState.masterUrl}
  //       action={{
  //         label: "Back to Dashboard",
  //         onAction: () => router.push('/dashboard')
  //       }}
  //     />
  //   );
  // }

  return (
    <div className="min-h-screen bg-[#101010] flex flex-col justify-between overflow-hidden">

      <main className="flex-1 flex flex-col justify-center items-center overflow-hidden">
        {rtcError && (
          <div className="w-full max-w-lg mx-auto my-2 px-4 py-2 bg-[#ff4d4f]/10 border border-[#ff4d4f]/30 rounded-md text-[#ff4d4f] text-xs text-center">
            {rtcError}
          </div>
        )}
        <VideoGrid
          localStream={localStream}
          remoteStream={remoteStream}
          currentRole={currentProfile?.role ?? "candidate"}
          peerProfile={peerProfile}
          isMicMuted={isMicMuted}
          isCameraOff={isCameraOff}
        />
      </main>

      <MediaControls
        actions={[
          {
            id: 'mic',
            label: isMicMuted ? 'Unmute' : 'Mute',
            title: isMicMuted ? 'Unmute Microphone' : 'Mute Microphone',
            enabled: !isMicMuted,
            onAction: toggleMic,
          },
          {
            id: 'camera',
            label: isCameraOff ? 'Camera On' : 'Camera Off',
            title: isCameraOff ? 'Turn Camera On' : 'Turn Camera Off',
            enabled: !isCameraOff,
            onAction: toggleCamera,
          },
          {
            id: 'end-call',
            label: 'End Call',
            title: 'Leave Interview Call',
            enabled: false,
            onAction: onUserTriggeredEndCall,
          },
        ]}
      />
    </div>
  );
}
