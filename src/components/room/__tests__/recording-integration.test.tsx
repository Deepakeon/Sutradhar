import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { InterviewRoomContainer } from '../interview-room-container';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Supabase
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSchema = vi.fn();
const mockChannel = vi.fn();
const mockRemoveChannel = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    schema: mockSchema,
    from: mockFrom,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  }),
}));

// Mock OPFS storage
vi.mock('@/lib/opfs/recording-storage', () => ({
  isOPFSSupported: vi.fn().mockReturnValue(true),
  appendRecordingChunk: vi.fn().mockResolvedValue(undefined),
  finalizeRecording: vi.fn().mockResolvedValue({ success: true, durationMs: 4000, byteLength: 512 }),
}));

class MockMediaRecorder {
  stream: any;
  options: any;
  state = 'inactive';
  ondataavailable: ((e: any) => void) | null = null;
  onstop: (() => void) | null = null;

  constructor(stream: any, options?: any) {
    this.stream = stream;
    this.options = options;
  }

  start = vi.fn().mockImplementation(() => {
    this.state = 'recording';
  });

  stop = vi.fn().mockImplementation(() => {
    this.state = 'inactive';
    if (this.onstop) this.onstop();
  });

  static isTypeSupported = vi.fn().mockReturnValue(true);
}

class MockMediaStream {
  tracks: any[];
  constructor(tracks: any[] = []) {
    this.tracks = tracks;
  }
  getVideoTracks() {
    return this.tracks.filter((t) => t.kind === 'video');
  }
  getAudioTracks() {
    return this.tracks.filter((t) => t.kind === 'audio');
  }
  getTracks() {
    return this.tracks;
  }
}

class MockAudioContext {
  state = 'running';
  createMediaStreamSource = vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
  createMediaStreamDestination = vi.fn().mockReturnValue({
    stream: new MockMediaStream([{ kind: 'audio', id: 'mixed' }]),
  });
  close = vi.fn().mockResolvedValue(undefined);
}

describe('Room Recording Integration Flow', () => {
  let mockDisplayStream: any;
  let mockGetDisplayMedia: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('MediaRecorder', MockMediaRecorder);
    vi.stubGlobal('MediaStream', MockMediaStream);
    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.stubGlobal('webkitAudioContext', MockAudioContext);

    const displayVideoTrack = {
      kind: 'video',
      id: 'screen-track-1',
      stop: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onended: null,
    };
    mockDisplayStream = new MockMediaStream([displayVideoTrack]);
    mockGetDisplayMedia = vi.fn().mockResolvedValue(mockDisplayStream);

    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(
          new MockMediaStream([
            { kind: 'video', enabled: true, stop: vi.fn() },
            { kind: 'audio', enabled: true, stop: vi.fn() },
          ])
        ),
        getDisplayMedia: mockGetDisplayMedia,
        enumerateDevices: vi.fn().mockResolvedValue([]),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      storage: {
        getDirectory: vi.fn(),
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ success: true }),
      })
    );

    mockSchema.mockReturnValue({ from: mockFrom });
    mockChannel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      send: vi.fn().mockResolvedValue('ok'),
      track: vi.fn().mockResolvedValue('ok'),
    });

    // Authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'usr-1', email: 'alice@example.com' } },
      error: null,
    });

    // Authorized interview
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'room-rec-test',
              title: 'System Design Mock',
              candidate_id: 'usr-1',
              interviewer_id: 'usr-2',
              status: 'scheduled',
              session_started_at: new Date().toISOString(),
            },
            error: null,
          }),
        }),
      }),
    });
  });

  it('displays explanatory prompt modal and allows user to skip recording', async () => {
    render(<InterviewRoomContainer interviewId="room-rec-test" />);

    // Wait for room load
    await waitFor(() => {
      expect(screen.getByText('Record Your Practice Interview?')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Your recording is stored strictly inside your browser \(OPFS\)/)
    ).toBeInTheDocument();

    // Click "Skip for Now"
    fireEvent.click(screen.getByText('Skip for Now'));

    await waitFor(() => {
      expect(screen.queryByText('Record Your Practice Interview?')).not.toBeInTheDocument();
    });

    // Notification appears, call continues
    expect(screen.getByText(/Interview recording skipped/)).toBeInTheDocument();
    expect(screen.getByText('System Design Mock')).toBeInTheDocument();
    expect(mockGetDisplayMedia).not.toHaveBeenCalled();
  });

  it('triggers tab capture and starts OPFS recording when user allows recording', async () => {
    render(<InterviewRoomContainer interviewId="room-rec-test" />);

    await waitFor(() => {
      expect(screen.getByText('Allow Recording')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Allow Recording'));
    });

    expect(mockGetDisplayMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        video: expect.objectContaining({ displaySurface: 'browser' }),
        audio: true,
      })
    );

    await waitFor(() => {
      expect(screen.queryByText('Record Your Practice Interview?')).not.toBeInTheDocument();
      // MediaControls record button now says "Stop Rec"
      expect(screen.getByText('Stop Rec')).toBeInTheDocument();
    });
  });

  it('allows mid-call recording toggle from media controls without page reload', async () => {
    render(<InterviewRoomContainer interviewId="room-rec-test" />);

    await waitFor(() => {
      expect(screen.getByText('Skip for Now')).toBeInTheDocument();
    });

    // Skip initially
    fireEvent.click(screen.getByText('Skip for Now'));

    // Mid-call: Profile decides to start recording
    const recordBtn = screen.getByText('Record');
    await act(async () => {
      fireEvent.click(recordBtn);
    });

    expect(mockGetDisplayMedia).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText('Stop Rec')).toBeInTheDocument();
    });

    // Mid-call: Profile stops recording
    const stopBtn = screen.getByText('Stop Rec');
    await act(async () => {
      fireEvent.click(stopBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Record')).toBeInTheDocument();
    });
  });
});
