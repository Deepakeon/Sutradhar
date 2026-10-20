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
  const supabase = createClient();

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
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            type: 'ice-candidate',
            senderId: currentProfile.id,
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
        const inboundStream = new MediaStream([event.track]);
        setRemoteStream(inboundStream);
      }
    };

    // Add local tracks to PC
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    return pc;
  }, [currentProfile.id, localStream]);

  // Update PC tracks if localStream changes
  useEffect(() => {
    const pc = pcRef.current;
    if (pc && localStream) {
      const senders = pc.getSenders();
      localStream.getTracks().forEach((track) => {
        const sender = senders.find((s) => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track);
        } else {
          pc.addTrack(track, localStream);
        }
      });
    }
  }, [localStream]);

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
    channel.on('presence', { event: 'sync' }, async () => {
      const state = channel.presenceState();
      const participants: RoomParticipant[] = [];

      Object.values(state).forEach((presences) => {
        (presences as unknown as RoomParticipant[]).forEach((p) => {
          if (p.id !== currentProfile.id) {
            participants.push(p);
          }
        });
      });

      if (participants.length > 0) {
        const peer = participants[0];
        setPeerProfile(peer);

        // Interviewer initiates the WebRTC offer
        if (currentProfile.role === 'interviewer') {
          const pc = getOrCreatePC();
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          channel.send({
            type: 'broadcast',
            event: 'signal',
            payload: {
              type: 'offer',
              senderId: currentProfile.id,
              recipientId: peer.id,
              sdp: offer,
              timestamp: Date.now(),
            } as SignalingPayload,
          });
        }
      } else {
        setPeerProfile(null);
      }
    });

    // Broadcast Signaling Handling
    channel.on('broadcast', { event: 'signal' }, async ({ payload }: { payload: SignalingPayload }) => {
      const pc = getOrCreatePC();

      if (payload.type === 'offer') {
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
            senderId: currentProfile.id,
            sdp: answer,
            timestamp: Date.now(),
          } as SignalingPayload,
        });
      } else if (payload.type === 'answer') {
        if (pc.signalingState !== 'stable') {
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
        onCallEnded?.();
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
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [interviewId, currentProfile, getOrCreatePC, onCallEnded, supabase]);

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
