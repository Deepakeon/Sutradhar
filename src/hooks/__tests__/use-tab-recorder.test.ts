/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTabRecorder } from '../use-tab-recorder';
import { OpfsRecordingStorage } from '@/lib/recording';
import { createMockOpfsRoot } from '@/lib/recording/__tests__/mocks/opfs-mock';
import {
  EBML_ID,
  createMasterElement,
  createUIntElement,
  createStringElement,
  writeVint,
  inspectWebM,
} from '@/lib/recording/ebml-patcher';

describe('useTabRecorder', () => {
  let mockOpfsRoot: FileSystemDirectoryHandle;
  let mockStorage: OpfsRecordingStorage;
  let mockDisplayStream: any;
  let mockVideoTrack: any;
  let mockTabAudioTrack: any;
  let mockLocalAudioTrack: any;
  let mockLocalStream: any;
  let mockRemoteAudioTrack: any;
  let mockRemoteStream: any;
  let mockMediaRecorderInstances: any[];
  let getDisplayMediaMock: ReturnType<typeof vi.fn>;
  let speakerConnections: any[];
  let mockAudioContextDestination: any;

  function buildSyntheticChunks() {
    const ebmlHeader = createMasterElement(EBML_ID.EBML, [
      createStringElement(EBML_ID.DocType, 'webm'),
    ]);
    const info = createMasterElement(EBML_ID.Info, [
      createUIntElement(EBML_ID.TimecodeScale, 1000000),
      createStringElement(EBML_ID.WritingApp, 'Sutradhar-OPFS-Recorder'),
    ]);
    const track = createMasterElement(EBML_ID.TrackEntry, [
      createUIntElement(EBML_ID.TrackNumber, 1),
      createUIntElement(EBML_ID.TrackType, 1),
      createStringElement(EBML_ID.CodecID, 'V_VP8'),
    ]);
    const tracks = createMasterElement(EBML_ID.Tracks, [track]);

    function createCluster(tc: number, relTime = 0) {
      const timeElem = createUIntElement(EBML_ID.Timestamp, tc);
      const blockHeader = new Uint8Array([0x81, (relTime >> 8) & 0xff, relTime & 0xff, 0x80]);
      const blockPayload = new Uint8Array([1, 2, 3, 4, 5]);
      const blockData = new Uint8Array([...blockHeader, ...blockPayload]);
      const simpleBlock = new Uint8Array([0xa3, ...writeVint(blockData.length), ...blockData]);
      return createMasterElement(EBML_ID.Cluster, [timeElem, simpleBlock]);
    }

    const segHeader = new Uint8Array([
      0x18, 0x53, 0x80, 0x67,
      0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    ]);

    const c1 = createCluster(0, 0);
    const chunk0 = new Blob([new Uint8Array([...ebmlHeader, ...segHeader, ...info, ...tracks, ...c1])], {
      type: 'video/webm',
    });
    const chunk1 = new Blob([createCluster(1000, 30)], { type: 'video/webm' });

    return { chunk0, chunk1 };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    speakerConnections = [];

    mockOpfsRoot = createMockOpfsRoot();
    mockStorage = new OpfsRecordingStorage(mockOpfsRoot);

    mockVideoTrack = {
      kind: 'video',
      id: 'mock-display-video-1',
      stop: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onended: null,
    };

    mockTabAudioTrack = {
      kind: 'audio',
      id: 'mock-tab-audio-1',
      stop: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    mockDisplayStream = {
      id: 'mock-display-stream',
      getVideoTracks: vi.fn().mockReturnValue([mockVideoTrack]),
      getAudioTracks: vi.fn().mockReturnValue([mockTabAudioTrack]),
      getTracks: vi.fn().mockReturnValue([mockVideoTrack, mockTabAudioTrack]),
    };

    mockLocalAudioTrack = {
      kind: 'audio',
      id: 'mock-local-mic-1',
      stop: vi.fn(),
    };
    mockLocalStream = {
      id: 'mock-local-stream',
      getAudioTracks: vi.fn().mockReturnValue([mockLocalAudioTrack]),
      getTracks: vi.fn().mockReturnValue([mockLocalAudioTrack]),
    };

    mockRemoteAudioTrack = {
      kind: 'audio',
      id: 'mock-remote-audio-1',
      stop: vi.fn(),
    };
    mockRemoteStream = {
      id: 'mock-remote-stream',
      getAudioTracks: vi.fn().mockReturnValue([mockRemoteAudioTrack]),
      getTracks: vi.fn().mockReturnValue([mockRemoteAudioTrack]),
    };

    getDisplayMediaMock = vi.fn().mockResolvedValue(mockDisplayStream);

    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      maxTouchPoints: 0,
      mediaDevices: {
        getDisplayMedia: getDisplayMediaMock,
      },
      storage: {
        getDirectory: vi.fn().mockResolvedValue(mockOpfsRoot),
      },
    });

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
    vi.stubGlobal('MediaStream', MockMediaStream);

    // Mock AudioContext
    mockAudioContextDestination = { id: 'physical-speakers' };
    class MockAudioNode {
      connections: any[] = [];
      connect(target: any) {
        this.connections.push(target);
        if (target === mockAudioContextDestination) {
          speakerConnections.push(this);
        }
      }
      disconnect = vi.fn().mockImplementation(() => {
        this.connections = [];
      });
    }

    class MockGainNode extends MockAudioNode {
      gain = { value: 1.0 };
    }

    class MockDestinationNode extends MockAudioNode {
      stream = new MockMediaStream([
        { kind: 'audio', id: 'mixed-composite-audio-track', stop: vi.fn() },
      ]);
    }

    class MockAudioContext {
      state = 'running';
      destination = mockAudioContextDestination;
      createMediaStreamDestination = vi.fn().mockReturnValue(new MockDestinationNode());
      createMediaStreamSource = vi.fn().mockImplementation((stream: any) => {
        const node = new MockAudioNode();
        (node as any).stream = stream;
        return node;
      });
      createGain = vi.fn().mockReturnValue(new MockGainNode());
      close = vi.fn().mockImplementation(async () => {
        this.state = 'closed';
      });
    }
    vi.stubGlobal('AudioContext', MockAudioContext);

    // Mock MediaRecorder
    mockMediaRecorderInstances = [];
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
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('detects desktop environment support on mount', () => {
    const { result } = renderHook(() =>
      useTabRecorder({
        interviewId: 'test-interview-1',
        storage: mockStorage,
      })
    );

    expect(result.current.isSupported).toBe(true);
    expect(result.current.isRecording).toBe(false);
    expect(result.current.duration).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('detects mobile or unsupported environments gracefully without throwing runtime errors', async () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148',
      maxTouchPoints: 5,
    });

    const { result } = renderHook(() =>
      useTabRecorder({
        interviewId: 'test-interview-mobile',
        storage: mockStorage,
      })
    );

    expect(result.current.isSupported).toBe(false);
    expect(result.current.unsupportedReason).toContain('Mobile');

    let started = false;
    await act(async () => {
      started = await result.current.startRecording();
    });

    expect(started).toBe(false);
    expect(result.current.error).toContain('not supported');
    expect(result.current.isRecording).toBe(false);
  });

  it('captures current tab with displaySurface browser preference and mixes audio', async () => {
    const onStart = vi.fn();
    const { result } = renderHook(() =>
      useTabRecorder({
        interviewId: 'test-interview-capture',
        localStream: mockLocalStream,
        remoteStream: mockRemoteStream,
        storage: mockStorage,
        onRecordingStart: onStart,
      })
    );

    let started = false;
    await act(async () => {
      started = await result.current.startRecording();
    });

    expect(started).toBe(true);
    expect(result.current.isRecording).toBe(true);
    expect(onStart).toHaveBeenCalled();

    // Verify getDisplayMedia options
    expect(getDisplayMediaMock).toHaveBeenCalledWith(
      expect.objectContaining({
        video: expect.objectContaining({ displaySurface: 'browser' }),
        audio: true,
        preferCurrentTab: true,
      })
    );

    // Verify MediaRecorder configured with 10s (10000ms) timeslice
    expect(mockMediaRecorderInstances.length).toBe(1);
    const recorder = mockMediaRecorderInstances[0];
    expect(recorder.start).toHaveBeenCalledWith(10000);

    // Verify composite stream contains display video track and mixed audio track
    expect(result.current.compositeStream).not.toBeNull();
    const videoTracks = result.current.compositeStream?.getVideoTracks() || [];
    const audioTracks = result.current.compositeStream?.getAudioTracks() || [];
    expect(videoTracks.length).toBe(1);
    expect(videoTracks[0].id).toBe('mock-display-video-1');
    expect(audioTracks.length).toBe(1);
    expect(audioTracks[0].id).toBe('mixed-composite-audio-track');
  });

  it('streams chunks sequentially to OPFS storage core every 10 seconds', async () => {
    const { result } = renderHook(() =>
      useTabRecorder({
        interviewId: 'test-interview-streaming',
        localStream: mockLocalStream,
        storage: mockStorage,
      })
    );

    await act(async () => {
      await result.current.startRecording();
    });

    const recorder = mockMediaRecorderInstances[0];
    expect(recorder).toBeDefined();

    // Emit chunk 1
    const chunk1 = new Blob(['chunk-data-1'], { type: 'video/webm' });
    await act(async () => {
      recorder.ondataavailable?.({ data: chunk1 });
    });

    let meta = await mockStorage.getRecordingMetadata('test-interview-streaming');
    expect(meta).not.toBeNull();
    expect(meta?.status).toBe('recording');
    expect(meta?.chunkCount).toBe(1);

    // Emit chunk 2
    const chunk2 = new Blob(['chunk-data-2'], { type: 'video/webm' });
    await act(async () => {
      recorder.ondataavailable?.({ data: chunk2 });
    });

    meta = await mockStorage.getRecordingMetadata('test-interview-streaming');
    expect(meta?.chunkCount).toBe(2);
  });

  it('finalizes OPFS container and tears down tracks when stopRecording is called', async () => {
    const onStop = vi.fn();
    const { result } = renderHook(() =>
      useTabRecorder({
        interviewId: 'test-interview-stop',
        localStream: mockLocalStream,
        storage: mockStorage,
        onRecordingStop: onStop,
      })
    );

    await act(async () => {
      await result.current.startRecording();
    });

    const recorder = mockMediaRecorderInstances[0];
    const chunk = new Blob(['final-chunk'], { type: 'video/webm' });
    await act(async () => {
      recorder.ondataavailable?.({ data: chunk });
    });

    // Advance timer 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.duration).toBe(3);

    // Stop recording
    let finalMeta: any = null;
    await act(async () => {
      finalMeta = await result.current.stopRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(finalMeta).not.toBeNull();
    expect(finalMeta.status).toBe('finalized');
    expect(onStop).toHaveBeenCalledWith(finalMeta);

    // Display tracks must be stopped
    expect(mockVideoTrack.stop).toHaveBeenCalled();
    expect(mockTabAudioTrack.stop).toHaveBeenCalled();

    // Local mic audio track MUST NOT be stopped (active call remains untouched)
    expect(mockLocalAudioTrack.stop).not.toHaveBeenCalled();
  });

  it('handles user clicking native browser "Stop sharing" via video track ended event', async () => {
    let endedHandler: (() => void) | null = null;
    mockVideoTrack.addEventListener = vi.fn().mockImplementation((event: string, handler: any) => {
      if (event === 'ended') {
        endedHandler = handler;
      }
    });

    const { result } = renderHook(() =>
      useTabRecorder({
        interviewId: 'test-interview-ended-event',
        localStream: mockLocalStream,
        storage: mockStorage,
      })
    );

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);
    expect(endedHandler).not.toBeNull();

    // User clicks native Chrome "Stop sharing"
    await act(async () => {
      endedHandler!();
    });

    expect(result.current.isRecording).toBe(false);
    const meta = await mockStorage.getRecordingMetadata('test-interview-ended-event');
    expect(meta?.status).toBe('finalized');
  });

  it('handles user denying tab capture permission gracefully without crashing', async () => {
    getDisplayMediaMock.mockRejectedValueOnce(
      new DOMException('Permission denied', 'NotAllowedError')
    );

    const onError = vi.fn();
    const { result } = renderHook(() =>
      useTabRecorder({
        interviewId: 'test-interview-denied',
        storage: mockStorage,
        onRecordingError: onError,
      })
    );

    let started = true;
    await act(async () => {
      started = await result.current.startRecording();
    });

    expect(started).toBe(false);
    expect(result.current.isRecording).toBe(false);
    expect(result.current.error).toContain('Permission denied');
  });

  it('cleans up recorder and tracks on hook unmount if recording is active', async () => {
    const { result, unmount } = renderHook(() =>
      useTabRecorder({
        interviewId: 'test-interview-unmount',
        localStream: mockLocalStream,
        storage: mockStorage,
      })
    );

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);

    // Unmount hook mid-recording
    act(() => {
      unmount();
    });

    // Display tracks must be cleaned up
    expect(mockVideoTrack.stop).toHaveBeenCalled();
  });

  it('prevents acoustic feedback by never connecting audio mixer nodes to AudioContext.destination', async () => {
    const { result } = renderHook(() =>
      useTabRecorder({
        interviewId: 'test-interview-feedback',
        localStream: mockLocalStream,
        remoteStream: mockRemoteStream,
        storage: mockStorage,
      })
    );

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);
    expect(speakerConnections.length).toBe(0);
  });

  it('supports custom timeslice configuration', async () => {
    const { result } = renderHook(() =>
      useTabRecorder({
        interviewId: 'test-interview-timeslice',
        timesliceMs: 5000,
        storage: mockStorage,
      })
    );

    await act(async () => {
      await result.current.startRecording();
    });

    const recorder = mockMediaRecorderInstances[0];
    expect(recorder.start).toHaveBeenCalledWith(5000);
  });

  it('streams synthetic WebM clusters and produces seekable container on finalization', async () => {
    const { result } = renderHook(() =>
      useTabRecorder({
        interviewId: 'test-interview-synthetic-webm',
        localStream: mockLocalStream,
        storage: mockStorage,
      })
    );

    await act(async () => {
      await result.current.startRecording();
    });

    const recorder = mockMediaRecorderInstances[0];
    const { chunk0, chunk1 } = buildSyntheticChunks();
    await act(async () => {
      recorder.ondataavailable?.({ data: chunk0 });
      recorder.ondataavailable?.({ data: chunk1 });
    });

    let finalMeta: any = null;
    await act(async () => {
      finalMeta = await result.current.stopRecording();
    });

    expect(finalMeta?.status).toBe('finalized');
    expect(finalMeta?.isSeekable).toBe(true);

    const file = await mockStorage.getRecordingFile('test-interview-synthetic-webm');
    expect(file).not.toBeNull();
    const bytes = new Uint8Array(await file!.arrayBuffer());
    const inspection = inspectWebM(bytes);
    expect(inspection.isSeekable).toBe(true);
    expect(inspection.hasCues).toBe(true);
  });
});
