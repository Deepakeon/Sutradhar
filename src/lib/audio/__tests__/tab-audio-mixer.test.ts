/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createAudioMixer,
  detectRecordingEnvironment,
} from '../tab-audio-mixer';

describe('tab-audio-mixer & environment detection', () => {
  describe('detectRecordingEnvironment', () => {
    it('detects desktop environment with full support', () => {
      const result = detectRecordingEnvironment({
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        navigatorObj: {
          mediaDevices: { getDisplayMedia: () => {} },
          storage: { getDirectory: () => {} },
          maxTouchPoints: 0,
        },
        windowObj: {
          AudioContext: class {},
          MediaRecorder: { isTypeSupported: () => true },
        },
      });

      expect(result.supported).toBe(true);
      expect(result.isMobile).toBe(false);
      expect(result.hasDisplayMedia).toBe(true);
      expect(result.hasAudioContext).toBe(true);
      expect(result.hasOpfs).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('detects mobile user agents (Android, iPhone, iPad) and flags as unsupported', () => {
      const androidResult = detectRecordingEnvironment({
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36',
        navigatorObj: {
          mediaDevices: { getDisplayMedia: () => {} },
          storage: { getDirectory: () => {} },
        },
        windowObj: { AudioContext: class {}, MediaRecorder: {} },
      });
      expect(androidResult.supported).toBe(false);
      expect(androidResult.isMobile).toBe(true);
      expect(androidResult.reason?.toLowerCase()).toContain('mobile');

      const iphoneResult = detectRecordingEnvironment({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
        navigatorObj: {},
        windowObj: { AudioContext: class {}, MediaRecorder: {} },
      });
      expect(iphoneResult.supported).toBe(false);
      expect(iphoneResult.isMobile).toBe(true);

      const ipadResult = detectRecordingEnvironment({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        navigatorObj: { maxTouchPoints: 5 },
        windowObj: { AudioContext: class {}, MediaRecorder: {} },
      });
      expect(ipadResult.supported).toBe(false);
      expect(ipadResult.isMobile).toBe(true);
    });

    it('flags unsupported when getDisplayMedia is missing', () => {
      const result = detectRecordingEnvironment({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        navigatorObj: {
          mediaDevices: {},
          storage: { getDirectory: () => {} },
        },
        windowObj: { AudioContext: class {}, MediaRecorder: {} },
      });

      expect(result.supported).toBe(false);
      expect(result.hasDisplayMedia).toBe(false);
      expect(result.reason).toContain('getDisplayMedia');
    });

    it('flags unsupported when AudioContext or MediaRecorder is missing', () => {
      const noAudio = detectRecordingEnvironment({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        navigatorObj: {
          mediaDevices: { getDisplayMedia: () => {} },
          storage: { getDirectory: () => {} },
        },
        windowObj: { MediaRecorder: {} },
      });
      expect(noAudio.supported).toBe(false);
      expect(noAudio.hasAudioContext).toBe(false);

      const noRecorder = detectRecordingEnvironment({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        navigatorObj: {
          mediaDevices: { getDisplayMedia: () => {} },
          storage: { getDirectory: () => {} },
        },
        windowObj: { AudioContext: class {} },
      });
      expect(noRecorder.supported).toBe(false);
      expect(noRecorder.hasMediaRecorder).toBe(false);
    });

    it('handles SSR gracefully without throwing errors', () => {
      const result = detectRecordingEnvironment({
        userAgent: '',
        navigatorObj: null,
        windowObj: null,
      });
      expect(result.supported).toBe(false);
    });
  });

  describe('Audio Mixing and Feedback Prevention', () => {
    let mockAudioContext: any;
    let mockDestinationNode: any;
    let createdSources: any[];
    let createdGains: any[];
    let destinationConnections: any[];
    let speakerConnections: any[];

    beforeEach(() => {
      createdSources = [];
      createdGains = [];
      destinationConnections = [];
      speakerConnections = [];

      class MockAudioNode {
        connections: any[] = [];
        connect(target: any) {
          this.connections.push(target);
          if (target === mockAudioContext.destination) {
            speakerConnections.push(this);
          }
          if (target === mockDestinationNode) {
            destinationConnections.push(this);
          }
        }
        disconnect = vi.fn().mockImplementation(() => {
          this.connections = [];
        });
      }

      class MockGainNode extends MockAudioNode {
        gain = { value: 1.0 };
      }

      class MockMediaStreamSourceNode extends MockAudioNode {
        constructor(public stream: any) {
          super();
          createdSources.push(this);
        }
      }

      mockDestinationNode = new MockAudioNode();
      mockDestinationNode.stream = {
        getAudioTracks: () => [{ kind: 'audio', id: 'mixed-audio-track', stop: vi.fn() }],
      };

      mockAudioContext = {
        state: 'running',
        destination: new MockAudioNode(), // Physical audio hardware (speakers)
        createMediaStreamDestination: vi.fn().mockReturnValue(mockDestinationNode),
        createMediaStreamSource: vi.fn().mockImplementation((stream: any) => {
          return new MockMediaStreamSourceNode(stream);
        }),
        createGain: vi.fn().mockImplementation(() => {
          const gain = new MockGainNode();
          createdGains.push(gain);
          return gain;
        }),
        close: vi.fn().mockImplementation(async () => {
          mockAudioContext.state = 'closed';
        }),
      };
    });

    function createMockStream(id: string, hasAudio = true) {
      const track = { kind: 'audio', id: `${id}-track`, stop: vi.fn() };
      return {
        id,
        getAudioTracks: () => (hasAudio ? [track] : []),
        getTracks: () => (hasAudio ? [track] : []),
      };
    }

    it('mixes local mic stream and tab audio stream into destination node', () => {
      const localStream = createMockStream('local-mic') as any;
      const tabStream = createMockStream('tab-audio') as any;

      const mixer = createAudioMixer({
        localStream,
        tabStream,
        audioContext: mockAudioContext,
      });

      expect(mixer.destinationNode).toBe(mockDestinationNode);
      expect(mixer.mixedAudioTrack).not.toBeNull();
      expect(mixer.mixedAudioTrack?.id).toBe('mixed-audio-track');

      // Local and Tab sources must be created
      expect(createdSources.length).toBe(2);
      expect(createdGains.length).toBe(2);

      // Gains must connect to destinationNode
      expect(destinationConnections.length).toBe(2);
    });

    it('NEVER routes audio to audioContext.destination (prevents acoustic feedback / echo)', () => {
      const localStream = createMockStream('local-mic') as any;
      const tabStream = createMockStream('tab-audio') as any;
      const remoteStream = createMockStream('remote-peer') as any;

      createAudioMixer({
        localStream,
        tabStream,
        remoteStream,
        audioContext: mockAudioContext,
      });

      // Crucial: speakerConnections must be empty!
      expect(speakerConnections.length).toBe(0);
    });

    it('supports dynamic adding and removing of audio streams', () => {
      const mixer = createAudioMixer({
        audioContext: mockAudioContext,
      });
      expect(createdSources.length).toBe(0);

      // Add local stream
      const localStream = createMockStream('local-mic') as any;
      mixer.addStream(localStream, 'local');
      expect(createdSources.length).toBe(1);

      // Add remote stream
      const remoteStream = createMockStream('remote-peer') as any;
      mixer.addStream(remoteStream, 'remote');
      expect(createdSources.length).toBe(2);

      // Remove local stream
      mixer.removeStream('local');
      expect(mixer.localGainNode).toBeNull();
    });

    it('cleans up AudioContext and disconnects nodes without stopping stream tracks', async () => {
      const localStream = createMockStream('local-mic') as any;
      const tabStream = createMockStream('tab-audio') as any;

      const mixer = createAudioMixer({
        localStream,
        tabStream,
        audioContext: mockAudioContext,
      });

      await mixer.cleanup();

      expect(mockAudioContext.close).toHaveBeenCalled();
      expect(mockAudioContext.state).toBe('closed');
      // Local stream audio track must NOT be stopped (active call remains untouched)
      expect(localStream.getAudioTracks()[0].stop).not.toHaveBeenCalled();
    });
  });
});
