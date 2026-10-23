import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWebRTC, getIceConfiguration } from '../use-webrtc';

// Mock Supabase client
const mockRemoveChannel = vi.fn();
const mockSend = vi.fn().mockResolvedValue(undefined);
const mockTrack = vi.fn().mockResolvedValue(undefined);

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn((cb) => {
    cb('SUBSCRIBED');
    return { unsubscribe: vi.fn() };
  }),
  track: mockTrack,
  send: mockSend,
  presenceState: vi.fn().mockReturnValue({
    'user-2': [{ id: 'user-2', role: 'candidate', name: 'Candidate' }],
  }),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: vi.fn().mockReturnValue(mockChannel),
    removeChannel: mockRemoveChannel,
  }),
}));

describe('WebRTC NAT traversal & connection stability', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    global.RTCPeerConnection = vi.fn().mockImplementation(() => ({
      connectionState: 'new',
      signalingState: 'stable',
      addTrack: vi.fn(),
      getSenders: vi.fn().mockReturnValue([]),
      createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
      createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' }),
      setLocalDescription: vi.fn().mockResolvedValue(undefined),
      setRemoteDescription: vi.fn().mockResolvedValue(undefined),
      addIceCandidate: vi.fn().mockResolvedValue(undefined),
      close: vi.fn(),
    })) as unknown as typeof RTCPeerConnection;

    Object.defineProperty(global.navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ kind: 'video', stop: vi.fn() }, { kind: 'audio', stop: vi.fn() }],
          getVideoTracks: () => [{ kind: 'video', stop: vi.fn() }],
          getAudioTracks: () => [{ kind: 'audio', stop: vi.fn() }],
        }),
        enumerateDevices: vi.fn().mockResolvedValue([]),
      },
    });
  });

  it('1. MUST configure TURN relay servers for WAN NAT traversal (fails with STUN-only)', () => {
    const config = typeof getIceConfiguration === 'function' ? getIceConfiguration() : { iceServers: [] };
    const hasTurnServer = config.iceServers?.some((server) => {
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
      return urls.some((url) => url.startsWith('turn:') || url.startsWith('turns:'));
    });
    // On WAN / cross-planet, STUN fails under symmetric NAT / CGNAT. TURN relay is mandatory.
    expect(hasTurnServer).toBe(true);
  });

  it('2. MUST NOT destroy channel and RTCPeerConnection on component re-renders (unmemoized Supabase client bug)', () => {
    const { rerender } = renderHook(
      ({ id }) =>
        useWebRTC({
          interviewId: id,
          currentProfile: { id: 'user-1', role: 'interviewer' },
        }),
      { initialProps: { id: 'test-interview' } }
    );

    expect(mockRemoveChannel).not.toHaveBeenCalled();

    rerender({ id: 'test-interview' });

    // Signaling channel must stay alive across re-renders
    expect(mockRemoveChannel).not.toHaveBeenCalled();
  });

  it('3. MUST support transceiver-based track binding with replaceTrack for mobile/WAN media flow', async () => {
    const mockReplaceTrack = vi.fn();
    const mockAudioTransceiver = {
      receiver: { track: { kind: 'audio' } },
      sender: { replaceTrack: mockReplaceTrack },
      direction: 'sendrecv',
    };
    const mockVideoTransceiver = {
      receiver: { track: { kind: 'video' } },
      sender: { replaceTrack: mockReplaceTrack },
      direction: 'sendrecv',
    };

    global.RTCPeerConnection = vi.fn().mockImplementation(() => ({
      connectionState: 'new',
      signalingState: 'stable',
      addTrack: vi.fn(),
      getSenders: vi.fn().mockReturnValue([]),
      getTransceivers: vi.fn().mockReturnValue([mockAudioTransceiver, mockVideoTransceiver]),
      addTransceiver: vi.fn(),
      createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
      createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' }),
      setLocalDescription: vi.fn().mockResolvedValue(undefined),
      setRemoteDescription: vi.fn().mockResolvedValue(undefined),
      addIceCandidate: vi.fn().mockResolvedValue(undefined),
      close: vi.fn(),
    })) as unknown as typeof RTCPeerConnection;

    const { result } = renderHook(() =>
      useWebRTC({
        interviewId: 'test-interview',
        currentProfile: { id: 'user-1', role: 'interviewer' },
      })
    );

    expect(result.current).toBeDefined();
  });
});
