import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioStreamer } from '../use-audio-streamer';

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    schema: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  }),
}));

describe('useAudioStreamer', () => {
  let mockAudioTrack: any;
  let mockLocalStream: any;
  let mockRemoteTrack: any;
  let mockRemoteStream: any;
  let mockMediaRecorderInstances: any[];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockAudioTrack = { kind: 'audio', stop: vi.fn(), enabled: true };
    mockLocalStream = {
      getAudioTracks: vi.fn().mockReturnValue([mockAudioTrack]),
      getTracks: vi.fn().mockReturnValue([mockAudioTrack]),
    };

    mockRemoteTrack = { kind: 'audio', stop: vi.fn(), enabled: true };
    mockRemoteStream = {
      getAudioTracks: vi.fn().mockReturnValue([mockRemoteTrack]),
      getTracks: vi.fn().mockReturnValue([mockRemoteTrack]),
    };

    mockMediaRecorderInstances = [];

    class MockMediaStream {
      tracks: any[];
      constructor(tracks: any[] = []) {
        this.tracks = tracks;
      }
      getAudioTracks() {
        return this.tracks.filter((t) => t.kind === 'audio');
      }
      getTracks() {
        return this.tracks;
      }
    }
    vi.stubGlobal('MediaStream', MockMediaStream);

    // Mock global MediaRecorder
    class MockMediaRecorder {
      stream: any;
      options: any;
      state: string = 'inactive';
      ondataavailable: ((e: any) => void) | null = null;
      onstop: (() => void) | null = null;

      constructor(stream: any, options?: any) {
        this.stream = stream;
        this.options = options;
        mockMediaRecorderInstances.push(this);
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

    vi.stubGlobal('MediaRecorder', MockMediaRecorder);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('does not start recording when isCallActive is false', () => {
    const { result } = renderHook(() =>
      useAudioStreamer({
        interviewId: 'interview-123',
        localStream: mockLocalStream,
        isCallActive: false,
        role: 'candidate',
      })
    );

    expect(result.current.isRecording).toBe(false);
    expect(mockMediaRecorderInstances.length).toBe(0);
  });

  it('starts recording with 10s slice interval using only local audio track when call becomes active', () => {
    const { result } = renderHook(() =>
      useAudioStreamer({
        interviewId: 'interview-123',
        localStream: mockLocalStream,
        isCallActive: true,
        role: 'candidate',
      })
    );

    expect(result.current.isRecording).toBe(true);
    expect(mockMediaRecorderInstances.length).toBe(1);

    const recorder = mockMediaRecorderInstances[0];
    expect(recorder.start).toHaveBeenCalledWith(10000);
    expect(mockLocalStream.getAudioTracks).toHaveBeenCalled();
  });

  it('uploads 10s audio slices to /api/room/chunk-upload and increments uploadedChunksCount', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() =>
      useAudioStreamer({
        interviewId: 'interview-123',
        profileId: 'cand-123',
        localStream: mockLocalStream,
        isCallActive: true,
        role: 'candidate',
      })
    );

    const recorder = mockMediaRecorderInstances[0];
    const mockBlob = new Blob(['chunk-audio-bytes'], { type: 'audio/webm;codecs=opus' });

    await act(async () => {
      recorder.ondataavailable({ data: mockBlob });
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/room/chunk-upload');
    expect(options.method).toBe('POST');
    expect(options.body).toBeInstanceOf(FormData);

    const formData = options.body as FormData;
    expect(formData.get('interview_id')).toBe('interview-123');
    expect(formData.get('profile_id')).toBe('cand-123');
    expect(formData.get('role')).toBe('candidate');
    expect(formData.get('chunk_index')).toBe('0');

    expect(result.current.uploadedChunksCount).toBe(1);
  });

  it('retries failed uploads with backoff in memory', async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network drop'))
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ success: true }),
      });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() =>
      useAudioStreamer({
        interviewId: 'interview-123',
        localStream: mockLocalStream,
        isCallActive: true,
        role: 'interviewer',
      })
    );

    const recorder = mockMediaRecorderInstances[0];
    const mockBlob = new Blob(['chunk-audio-bytes'], { type: 'audio/webm;codecs=opus' });

    await act(async () => {
      recorder.ondataavailable({ data: mockBlob });
    });

    // First attempt failed
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.current.uploadedChunksCount).toBe(0);

    // Fast-forward backoff delay (1000ms)
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.current.uploadedChunksCount).toBe(1);
  });

  it('stops recording when call is ended', () => {
    const { rerender } = renderHook(
      (props: any) => useAudioStreamer(props),
      {
        initialProps: {
          interviewId: 'interview-123',
          localStream: mockLocalStream,
          isCallActive: true,
          role: 'candidate',
        },
      }
    );

    const recorder = mockMediaRecorderInstances[0];
    expect(recorder.state).toBe('recording');

    rerender({
      interviewId: 'interview-123',
      localStream: mockLocalStream,
      isCallActive: false,
      role: 'candidate',
    });

    expect(recorder.stop).toHaveBeenCalled();
  });

  it('anchors start offset accurately when user enters room after session start', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    // Mock system time to simulate joining 60 seconds after session started
    const baseTime = 1700000000000;
    const sessionStartTime = new Date(baseTime).toISOString();
    vi.setSystemTime(baseTime + 60000);

    const { result } = renderHook(() =>
      useAudioStreamer({
        interviewId: 'interview-123',
        profileId: 'interviewer-456',
        localStream: mockLocalStream,
        isCallActive: true,
        role: 'interviewer',
        sessionStartedAt: sessionStartTime,
      })
    );

    const recorder = mockMediaRecorderInstances[0];
    const mockBlob = new Blob(['audio-bytes'], { type: 'audio/webm;codecs=opus' });

    // Advance 10 seconds for first slice
    vi.setSystemTime(baseTime + 70000);

    await act(async () => {
      recorder.ondataavailable({ data: mockBlob });
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, options] = mockFetch.mock.calls[0];
    const formData = options.body as FormData;

    expect(formData.get('chunk_index')).toBe('0');
    expect(formData.get('start_offset_ms')).toBe('60000');
    expect(formData.get('end_offset_ms')).toBe('70000');
    expect(result.current.uploadedChunksCount).toBe(1);
  });
});
