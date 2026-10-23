'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { RoomParticipant, SignalingPayload } from '@/types/interview';

export function getIceConfiguration(): RTCConfiguration {
  const servers: RTCIceServer[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ];

  if (process.env.NEXT_PUBLIC_TURN_SERVER_URL) {
    servers.push({
      urls: process.env.NEXT_PUBLIC_TURN_SERVER_URL.split(',').map((u) => u.trim()),
      username: process.env.NEXT_PUBLIC_TURN_USERNAME || undefined,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || undefined,
    });
  } else {
    // Default TURN relay servers for WAN NAT traversal across symmetric NAT & CGNAT
    servers.push({
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turns:openrelay.metered.ca:443',
      ],
      username: 'openrelay',
      credential: 'openrelay',
    });
  }

  return {
    iceServers: servers,
    iceCandidatePoolSize: 10,
  };
}

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
  const supabase = useMemo(() => createClient(), []);

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

    const transceivers = typeof pc.getTransceivers === 'function' ? pc.getTransceivers() : [];
    const audioTransceiver = transceivers.find(
      (t) => t.receiver?.track?.kind === 'audio' || t.sender?.track?.kind === 'audio'
    );
    const videoTransceiver = transceivers.find(
      (t) => t.receiver?.track?.kind === 'video' || t.sender?.track?.kind === 'video'
    );
    const senders = typeof pc.getSenders === 'function' ? pc.getSenders() : [];

    // 1. Audio track (always m-line 0)
    if (audioTrack) {
      if (audioTransceiver?.sender) {
        audioTransceiver.sender.replaceTrack(audioTrack);
        audioTransceiver.direction = 'sendrecv';
      } else {
        const audioSender = senders.find((s) => s.track?.kind === 'audio');
        if (audioSender) {
          audioSender.replaceTrack(audioTrack);
        } else {
          pc.addTrack(audioTrack, stream);
        }
      }
    }

    // 2. Video track (always m-line 1)
    if (videoTrack) {
      if (videoTransceiver?.sender) {
        videoTransceiver.sender.replaceTrack(videoTrack);
        videoTransceiver.direction = 'sendrecv';
      } else {
        const videoSender = senders.find((s) => s.track?.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(videoTrack);
        } else {
          pc.addTrack(videoTrack, stream);
        }
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

    const pc = new RTCPeerConnection(getIceConfiguration());
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
      setRemoteStream((prev) => {
        const existing = prev ? prev.getTracks().filter((t) => t.id !== event.track.id) : [];
        return new MediaStream([...existing, event.track]);
      });
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
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp!));

        // If localStream is still initializing on the answerer, wait briefly (up to 2.5s)
        // so tracks are bound directly into the answer SDP
        if (!localStreamRef.current) {
          const start = Date.now();
          while (!localStreamRef.current && Date.now() - start < 2500) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }

        if (localStreamRef.current) {
          attachTracksInOrder(pc, localStreamRef.current);
        } else {
          // If stream still pending, ensure transceivers stay sendrecv for future replaceTrack
          const transceivers = typeof pc.getTransceivers === 'function' ? pc.getTransceivers() : [];
          transceivers.forEach((t) => {
            t.direction = 'sendrecv';
          });
        }

        // Process queued ICE candidates
        while (iceCandidateQueue.current.length > 0) {
          const candidate = iceCandidateQueue.current.shift();
          if (candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err: unknown) {
              console.warn('Could not add queued ICE candidate:', err);
            }
          }
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
            if (candidate) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (err: unknown) {
                console.warn('Could not add queued ICE candidate:', err);
              }
            }
          }
        }
      } else if (payload.type === 'ice-candidate') {
        if (payload.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (err: unknown) {
              console.warn('Could not add ICE candidate:', err);
            }
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
          id: currentProfileRef.current.id,
          role: currentProfileRef.current.role,
          name: currentProfileRef.current.name || currentProfileRef.current.role,
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
    getOrCreatePC,
    attachTracksInOrder,
    supabase,
  ]);

  // Initiate WebRTC Offer once both Peer is present and localStream is ready
  useEffect(() => {
    async function initiateOffer() {
      const isOfferRole =
        currentProfile.role === 'interviewer' ||
        (peerProfile?.role !== 'interviewer' && currentProfile.id > (peerProfile?.id || ''));

      if (
        isOfferRole &&
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
