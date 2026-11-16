import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRoomRecording } from '../use-room-recording';
import * as opfs from '@/lib/opfs/recording-storage';

// Mock OPFS functions
vi.mock('@/lib/opfs/recording-storage', () => ({
  isOPFSSupported: vi.fn().mockReturnValue(true),
  appendRecordingChunk: vi.fn().mockResolvedValue(undefined),
  finalizeRecording: vi.fn().mockResolvedValue({ success: true, durationMs: 5000, byteLength: 1024 }),
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
    stream: {
      getAudioTracks: () => [{ kind: 'audio', id: 'mixed-audio', stop: vi.fn() }],
    },
  });
  close = vi.fn().mockResolvedValue(undefined);
}

describe('useRoomRecording Hook', () => {
  let mockDisplayStream: any;
  let mockLocalStream: any;
  let mockRemoteStream: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('MediaRecorder', MockMediaRecorder);
    vi.stubGlobal('MediaStream', MockMediaStream);
    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.stubGlobal('webkitAudioContext', MockAudioContext);

    mockLocalStream = {
      getAudioTracks: () => [{ kind: 'audio', id: 'local-mic', stop: vi.fn() }],
      getVideoTracks: () => [{ kind: 'video', id: 'local-cam', stop: vi.fn() }],
      getTracks: () => [],
    };

    mockRemoteStream = {
      getAudioTracks: () => [{ kind: 'audio', id: 'remote-audio', stop: vi.fn() }],
      getTracks: () => [],
    };

    const displayVideoTrack = {
      kind: 'video',
      id: 'tab-video',
      stop: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onended: null,
    };

    mockDisplayStream = {
      getVideoTracks: () => [displayVideoTrack],
      getAudioTracks: () => [],
      getTracks: () => [displayVideoTrack],
    };

    vi.stubGlobal('navigator', {
      mediaDevices: {
        getDisplayMedia: vi.fn().mockResolvedValue(mockDisplayStream),
      },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      storage: {
        getDirectory: vi.fn(),
      },
    });
  });

  it('initializes with explanation prompt open on desktop', () => {
    const { result } = renderHook(() =>
      useRoomRecording({
        interviewId: 'test-interview-1',
        localStream: mockLocalStream,
        remoteStream: mockRemoteStream,
        autoPrompt: true,
      })
    );

    expect(result.current.isPromptOpen).toBe(true);
    expect(result.current.isRecording).toBe(false);
    expect(result.current.isSupported).toBe(true);
  });

  it('allows dismissing prompt without recording or blocking call', () => {
    const { result } = renderHook(() =>
      useRoomRecording({
        interviewId: 'test-interview-1',
        localStream: mockLocalStream,
        remoteStream: mockRemoteStream,
        autoPrompt: true,
      })
    );

    act(() => {
      result.current.dismissPrompt();
    });

    expect(result.current.isPromptOpen).toBe(false);
    expect(result.current.isRecording).toBe(false);
    expect(result.current.notification).toContain('skipped');
  });

  it('starts recording and streams chunks to OPFS on prompt acceptance', async () => {
    const { result } = renderHook(() =>
      useRoomRecording({
        interviewId: 'test-interview-1',
        localStream: mockLocalStream,
        remoteStream: mockRemoteStream,
        autoPrompt: true,
      })
    );

    await act(async () => {
      await result.current.startRecording();
    });

    expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        video: expect.objectContaining({ displaySurface: 'browser' }),
        audio: true,
      })
    );
    expect(result.current.isRecording).toBe(true);
    expect(result.current.isPromptOpen).toBe(false);
  });

  it('handles permission denial gracefully and keeps call active', async () => {
    (navigator.mediaDevices.getDisplayMedia as any).mockRejectedValueOnce(
      new DOMException('Permission denied', 'NotAllowedError')
    );

    const { result } = renderHook(() =>
      useRoomRecording({
        interviewId: 'test-interview-1',
        localStream: mockLocalStream,
        remoteStream: mockRemoteStream,
        autoPrompt: true,
      })
    );

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.isPromptOpen).toBe(false);
    expect(result.current.notification).toContain('Permission denied');
  });

  it('stops recording and finalizes OPFS container when toggle is stopped', async () => {
    const { result } = renderHook(() =>
      useRoomRecording({
        interviewId: 'test-interview-1',
        localStream: mockLocalStream,
        remoteStream: mockRemoteStream,
        autoPrompt: false,
      })
    );

    await act(async () => {
      await result.current.startRecording();
    });
    expect(result.current.isRecording).toBe(true);

    await act(async () => {
      await result.current.stopRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(opfs.finalizeRecording).toHaveBeenCalledWith('test-interview-1', expect.any(Number));
  });

  it('detects mobile user agents and displays informational message', () => {
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getDisplayMedia: vi.fn(),
      },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)',
      storage: {
        getDirectory: vi.fn(),
      },
    });

    const { result } = renderHook(() =>
      useRoomRecording({
        interviewId: 'test-interview-mobile',
        localStream: mockLocalStream,
        remoteStream: mockRemoteStream,
        autoPrompt: true,
      })
    );

    expect(result.current.isSupported).toBe(false);
    expect(result.current.isPromptOpen).toBe(false);
    expect(result.current.notification).toContain('desktop');
  });
});
