import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InterviewRoomContainer } from '../interview-room-container';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Supabase client
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSchema = vi.fn();
const mockChannel = vi.fn();
const mockRemoveChannel = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    schema: mockSchema,
    from: mockFrom,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  }),
}));


// Setup WebRTC and Media Devices mocks
beforeEach(() => {
  vi.clearAllMocks();

  mockSchema.mockReturnValue({ from: mockFrom });

  // Mock navigator.mediaDevices
  const mockTrack = {
    kind: 'video',
    enabled: true,
    stop: vi.fn(),
  };
  const mockAudioTrack = {
    kind: 'audio',
    enabled: true,
    stop: vi.fn(),
  };

  const mockStream = {
    getTracks: () => [mockTrack, mockAudioTrack],
    getVideoTracks: () => [mockTrack],
    getAudioTracks: () => [mockAudioTrack],
  };

  Object.defineProperty(global.navigator, 'mediaDevices', {
    writable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue(mockStream),
      enumerateDevices: vi.fn().mockResolvedValue([
        { deviceId: 'mic-1', kind: 'audioinput', label: 'Default Microphone' },
        { deviceId: 'cam-1', kind: 'videoinput', label: 'FaceTime HD Camera' },
      ]),
    },
  });

  // Mock RTCPeerConnection
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

  // Mock Supabase Channel
  mockChannel.mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn((cb) => {
      cb('SUBSCRIBED');
      return { unsubscribe: vi.fn() };
    }),
    track: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockResolvedValue(undefined),
    presenceState: vi.fn().mockReturnValue({}),
  });
});

describe('Room Container Seam (/room/[id])', () => {
  it('redirects to login if user is unauthenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not logged in'),
    });

    render(<InterviewRoomContainer interviewId="session-123" />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login?next=/room/session-123');
    });
  });

  it('displays access restricted when user is not an authorized participant', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'unauthorized-user-id', user_metadata: {} } },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'session-123',
          candidate_id: 'candidate-id',
          interviewer_id: 'interviewer-id',
          title: 'Senior Frontend Architecture',
        },
        error: null,
      }),
    });

    render(<InterviewRoomContainer interviewId="session-123" />);

    await waitFor(() => {
      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
      expect(
        screen.getByText(/You are not an authorized participant/i)
      ).toBeInTheDocument();
    });
  });

  it('renders interview room and controls when authorized candidate enters', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'candidate-id', user_metadata: { full_name: 'Jane Candidate' } } },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'session-123',
          candidate_id: 'candidate-id',
          interviewer_id: 'interviewer-id',
          title: 'Fullstack Systems Interview',
        },
        error: null,
      }),
    });

    render(<InterviewRoomContainer interviewId="session-123" />);

    await waitFor(() => {
      expect(screen.getByText('Fullstack Systems Interview')).toBeInTheDocument();
      expect(screen.getByText('candidate')).toBeInTheDocument();
      expect(screen.getByText(/Waiting for partner/i)).toBeInTheDocument();
    });

    // Verify media controls toolbar buttons
    expect(screen.getByTitle('Mute Microphone')).toBeInTheDocument();
    expect(screen.getByTitle('Turn Camera Off')).toBeInTheDocument();
    expect(screen.getByTitle('Audio & Video Settings')).toBeInTheDocument();
    expect(screen.getByTitle('Leave Interview Call')).toBeInTheDocument();
  });

  it('toggles microphone and camera tracks via media controls', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'candidate-id', user_metadata: {} } },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'session-123',
          candidate_id: 'candidate-id',
          interviewer_id: 'interviewer-id',
          title: 'Systems Interview',
        },
        error: null,
      }),
    });

    render(<InterviewRoomContainer interviewId="session-123" />);

    await waitFor(() => {
      expect(screen.getByTitle('Mute Microphone')).toBeInTheDocument();
    });

    // Wait for localStream to be loaded in state
    await waitFor(() => {
      expect(screen.getByText('You (candidate)')).toBeInTheDocument();
    });

    const muteBtn = screen.getByTitle('Mute Microphone');
    fireEvent.click(muteBtn);

    await waitFor(() => {
      expect(screen.getByTitle('Unmute Microphone')).toBeInTheDocument();
    });

    const cameraBtn = screen.getByTitle('Turn Camera Off');
    fireEvent.click(cameraBtn);

    await waitFor(() => {
      expect(screen.getByTitle('Turn Camera On')).toBeInTheDocument();
    });
  });

  it('opens and closes device settings modal', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'candidate-id', user_metadata: {} } },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'session-123',
          candidate_id: 'candidate-id',
          interviewer_id: 'interviewer-id',
          title: 'Systems Interview',
        },
        error: null,
      }),
    });

    render(<InterviewRoomContainer interviewId="session-123" />);

    await waitFor(() => {
      expect(screen.getByTitle('Audio & Video Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Audio & Video Settings'));

    await waitFor(() => {
      expect(screen.getByText('Device Settings')).toBeInTheDocument();
    });

    expect(screen.getByText('Microphone')).toBeInTheDocument();
    expect(screen.getByText('Camera')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Done'));
    await waitFor(() => {
      expect(screen.queryByText('Device Settings')).not.toBeInTheDocument();
    });
  });

  it('ends call and transitions to concluded summary view', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'interviewer-id', user_metadata: {} } },
      error: null,
    });

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: mockUpdate,
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'session-123',
          candidate_id: 'candidate-id',
          interviewer_id: 'interviewer-id',
          title: 'Backend Scalability Call',
        },
        error: null,
      }),
    });

    render(<InterviewRoomContainer interviewId="session-123" />);

    await waitFor(() => {
      expect(screen.getByTitle('Leave Interview Call')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Leave Interview Call'));

    await waitFor(() => {
      expect(screen.getByText('Interview Session Concluded')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });
});
