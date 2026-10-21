'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { RoomParticipant, SignalingPayload } from '@/types/interview';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

interface UseWebRTCOptions {
  interviewId: string;
  currentProfile: RoomParticipant;
  onCallEnded?: () => void;
}

export function useWebRTC({ interviewId, currentProfile, onCallEnded }: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [peerProfile, setPeerProfile] = useState<RoomParticipant | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('');
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const hasOfferedRef = useRef(false);
  const currentProfileRef = useRef(currentProfile);
  const localStreamRef = useRef<MediaStream | null>(null);
  const onCallEndedRef = useRef(onCallEnded);
  const supabase = createClient();

  useEffect(() => {
    currentProfileRef.current = currentProfile;
  }, [currentProfile]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    onCallEndedRef.current = onCallEnded;
  }, [onCallEnded]);

  // Helper to ensure audio is always attached before video for deterministic SDP m-line ordering
  const attachTracksInOrder = useCallback((pc: RTCPeerConnection, stream: MediaStream) => {
    const audioTrack = stream.getAudioTracks()[0];
    const videoTrack = stream.getVideoTracks()[0];
    const senders = typeof pc.getSenders === 'function' ? pc.getSenders() : [];

    // 1. Audio track (always m-line 0)
    if (audioTrack) {
      const audioSender = senders.find((s) => s.track?.kind === 'audio');
      if (audioSender) {
        audioSender.replaceTrack(audioTrack);
      } else {
        pc.addTrack(audioTrack, stream);
      }
    }

    // 2. Video track (always m-line 1)
    if (videoTrack) {
      const videoSender = senders.find((s) => s.track?.kind === 'video');
      if (videoSender) {
        videoSender.replaceTrack(videoTrack);
      } else {
        pc.addTrack(videoTrack, stream);
      }
    }
  }, []);

  // Load available media devices
  const refreshDevices = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        setDevices(deviceList);
      }
    } catch (e: unknown) {
      console.warn('Could not enumerate devices:', e);
    }
  }, []);

  // Initialize Local Media Stream
  useEffect(() => {
    let active = true;

    async function initMedia() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) return;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: selectedVideoInput ? { deviceId: { exact: selectedVideoInput } } : true,
          audio: selectedAudioInput ? { deviceId: { exact: selectedAudioInput } } : true,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        setLocalStream(stream);
        await refreshDevices();
      } catch (err: unknown) {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Failed to access camera/mic';
          setError(msg);
        }
      }
    }

    initMedia();

    return () => {
      active = false;
    };
  }, [selectedAudioInput, selectedVideoInput, refreshDevices]);

  // Create Peer Connection and bind tracks
  const getOrCreatePC = useCallback(() => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        hasOfferedRef.current = false;
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            type: 'ice-candidate',
            senderId: currentProfileRef.current.id,
            candidate: event.candidate.toJSON(),
            timestamp: Date.now(),
          } as SignalingPayload,
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        setRemoteStream((prev) => {
          if (!prev) {
            return new MediaStream([event.track]);
          }
          if (!prev.getTracks().some((t) => t.id === event.track.id)) {
            prev.addTrack(event.track);
          }
          return new MediaStream(prev.getTracks());
        });
      }
    };

    // Add local tracks to PC in deterministic order (audio then video)
    if (localStreamRef.current) {
      attachTracksInOrder(pc, localStreamRef.current);
    }

    return pc;
  }, [attachTracksInOrder]);

  // Update PC tracks if localStream changes
  useEffect(() => {
    const pc = pcRef.current;
    if (pc && localStream) {
      attachTracksInOrder(pc, localStream);
    }
  }, [localStream, attachTracksInOrder]);

  // Signaling Setup via Supabase Realtime Channel
  useEffect(() => {
    if (!interviewId || !currentProfile.id) return;

    const channelName = `room:${interviewId}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: true, self: false },
        presence: { key: currentProfile.id },
      },
    });

    channelRef.current = channel;

    // Presence Tracking
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const participants: RoomParticipant[] = [];

      Object.values(state).forEach((presences) => {
        (presences as unknown as RoomParticipant[]).forEach((p) => {
          if (p.id !== currentProfileRef.current.id) {
            participants.push(p);
          }
        });
      });

      if (participants.length > 0) {
        setPeerProfile(participants[0]);
      } else {
        setPeerProfile(null);
        hasOfferedRef.current = false;
      }
    });

    // Broadcast Signaling Handling
    channel.on('broadcast', { event: 'signal' }, async ({ payload }: { payload: SignalingPayload }) => {
      if (!payload || payload.senderId === currentProfileRef.current.id) return;
      if (payload.recipientId && payload.recipientId !== currentProfileRef.current.id) return;

      const pc = getOrCreatePC();

      if (payload.type === 'offer') {
        if (localStreamRef.current) {
          attachTracksInOrder(pc, localStreamRef.current);
        }

        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp!));

        // Process queued ICE candidates
        while (iceCandidateQueue.current.length > 0) {
          const candidate = iceCandidateQueue.current.shift();
          if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        channel.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            type: 'answer',
            senderId: currentProfileRef.current.id,
            recipientId: payload.senderId,
            sdp: answer,
            timestamp: Date.now(),
          } as SignalingPayload,
        });
      } else if (payload.type === 'answer') {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp!));
          while (iceCandidateQueue.current.length > 0) {
            const candidate = iceCandidateQueue.current.shift();
            if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        }
      } else if (payload.type === 'ice-candidate') {
        if (payload.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } else {
            iceCandidateQueue.current.push(payload.candidate);
          }
        }
      } else if (payload.type === 'call-ended') {
        onCallEndedRef.current?.();
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          id: currentProfile.id,
          role: currentProfile.role,
          name: currentProfile.name || currentProfile.role,
          joinedAt: new Date().toISOString(),
        });
      }
    });

    return () => {
      hasOfferedRef.current = false;
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [
    interviewId,
    currentProfile.id,
    currentProfile.role,
    currentProfile.name,
    getOrCreatePC,
    attachTracksInOrder,
    supabase,
  ]);

  // Initiate WebRTC Offer once both Peer is present and localStream is ready
  useEffect(() => {
    async function initiateOffer() {
      if (
        currentProfile.role === 'interviewer' &&
        peerProfile &&
        localStream &&
        !hasOfferedRef.current &&
        channelRef.current
      ) {
        const pc = getOrCreatePC();
        if (pc.signalingState === 'stable') {
          hasOfferedRef.current = true;
          try {
            attachTracksInOrder(pc, localStream);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            channelRef.current.send({
              type: 'broadcast',
              event: 'signal',
              payload: {
                type: 'offer',
                senderId: currentProfile.id,
                recipientId: peerProfile.id,
                sdp: offer,
                timestamp: Date.now(),
              } as SignalingPayload,
            });
          } catch (err: unknown) {
            console.error('Failed to create/send WebRTC offer:', err);
            hasOfferedRef.current = false;
          }
        }
      }
    }

    initiateOffer();
  }, [
    currentProfile.role,
    currentProfile.id,
    peerProfile,
    localStream,
    getOrCreatePC,
    attachTracksInOrder,
  ]);

  // Media Controls
  const toggleMic = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMicMuted((prev) => !prev);
    }
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff((prev) => !prev);
    }
  }, [localStream]);

  const switchDevice = useCallback((kind: 'audioinput' | 'videoinput', deviceId: string) => {
    if (kind === 'audioinput') setSelectedAudioInput(deviceId);
    if (kind === 'videoinput') setSelectedVideoInput(deviceId);
  }, []);

  const endCall = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: {
          type: 'call-ended',
          senderId: currentProfile.id,
          timestamp: Date.now(),
        } as SignalingPayload,
      });
    }

    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    onCallEnded?.();
  }, [currentProfile.id, localStream, onCallEnded]);

  return {
    localStream,
    remoteStream,
    connectionState,
    isMicMuted,
    isCameraOff,
    peerProfile,
    devices,
    error,
    toggleMic,
    toggleCamera,
    switchDevice,
    endCall,
  };
}
