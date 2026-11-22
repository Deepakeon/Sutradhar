/**
 * Tab Audio Mixer and Environment Detection Module
 *
 * Mixes local microphone audio, remote WebRTC audio, and browser tab audio
 * into a single unified MediaStreamDestinationNode using the Web Audio API.
 * Prevents acoustic feedback loops by NEVER connecting any stream source
 * to AudioContext.destination (the physical speakers).
 */

export interface EnvironmentSupportResult {
  supported: boolean;
  isMobile: boolean;
  hasDisplayMedia: boolean;
  hasMediaRecorder: boolean;
  hasAudioContext: boolean;
  hasOpfs: boolean;
  reason?: string;
}

export interface DetectEnvironmentOptions {
  userAgent?: string;
  navigatorObj?: {
    mediaDevices?: { getDisplayMedia?: unknown };
    storage?: { getDirectory?: unknown };
    maxTouchPoints?: number;
  } | null;
  windowObj?: {
    AudioContext?: unknown;
    webkitAudioContext?: unknown;
    MediaRecorder?: unknown;
  } | null;
}

/**
 * Checks whether the current runtime environment is desktop-capable
 * and supports the required WebRTC display capture, Web Audio, MediaRecorder,
 * and OPFS APIs without throwing runtime exceptions.
 */
export function detectRecordingEnvironment(
  options?: DetectEnvironmentOptions
): EnvironmentSupportResult {
  const ua =
    options?.userAgent !== undefined
      ? options.userAgent
      : typeof navigator !== 'undefined'
      ? navigator.userAgent || ''
      : '';

  const nav =
    options?.navigatorObj !== undefined
      ? options.navigatorObj
      : typeof navigator !== 'undefined'
      ? (navigator as DetectEnvironmentOptions['navigatorObj'])
      : null;

  const win =
    options?.windowObj !== undefined
      ? options.windowObj
      : typeof window !== 'undefined'
      ? (window as unknown as DetectEnvironmentOptions['windowObj'])
      : null;

  if (!win && !nav && !ua) {
    return {
      supported: false,
      isMobile: false,
      hasDisplayMedia: false,
      hasMediaRecorder: false,
      hasAudioContext: false,
      hasOpfs: false,
      reason: 'Server-side rendering environment without browser APIs',
    };
  }

  // Detect Mobile User Agents
  const isMobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  // Detect iPadOS presenting as desktop Safari with touch points
  const isTouchMac =
    /Macintosh/i.test(ua) &&
    Boolean(nav && typeof nav.maxTouchPoints === 'number' && nav.maxTouchPoints > 2);

  const isMobile = Boolean(isMobileUa || isTouchMac);

  const hasDisplayMedia = Boolean(
    nav &&
      nav.mediaDevices &&
      typeof nav.mediaDevices.getDisplayMedia === 'function'
  );

  const hasMediaRecorder = Boolean(
    win && win.MediaRecorder !== undefined
  );

  const hasAudioContext = Boolean(
    win &&
      (win.AudioContext !== undefined || win.webkitAudioContext !== undefined)
  );

  const hasOpfs = Boolean(
    nav &&
      nav.storage &&
      typeof nav.storage.getDirectory === 'function'
  );

  if (isMobile) {
    return {
      supported: false,
      isMobile: true,
      hasDisplayMedia,
      hasMediaRecorder,
      hasAudioContext,
      hasOpfs,
      reason: 'Tab recording is desktop-only. Mobile devices are not supported.',
    };
  }

  if (!hasDisplayMedia) {
    return {
      supported: false,
      isMobile: false,
      hasDisplayMedia: false,
      hasMediaRecorder,
      hasAudioContext,
      hasOpfs,
      reason: 'Screen and tab capture (getDisplayMedia) is not supported in this browser.',
    };
  }

  if (!hasAudioContext) {
    return {
      supported: false,
      isMobile: false,
      hasDisplayMedia,
      hasMediaRecorder,
      hasAudioContext: false,
      hasOpfs,
      reason: 'Web Audio AudioContext is not supported in this browser.',
    };
  }

  if (!hasMediaRecorder) {
    return {
      supported: false,
      isMobile: false,
      hasDisplayMedia,
      hasMediaRecorder: false,
      hasAudioContext,
      hasOpfs,
      reason: 'MediaRecorder is not supported in this browser.',
    };
  }

  return {
    supported: true,
    isMobile: false,
    hasDisplayMedia: true,
    hasMediaRecorder: true,
    hasAudioContext: true,
    hasOpfs,
  };
}

export function isTabRecordingSupported(): boolean {
  return detectRecordingEnvironment().supported;
}

export type StreamMixerType = 'local' | 'tab' | 'remote';

export interface AudioMixerOptions {
  localStream?: MediaStream | null;
  tabStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
  audioContext?: AudioContext;
}

interface StreamAudioNodes {
  sourceNode: MediaStreamAudioSourceNode;
  gainNode: GainNode;
}

export interface AudioMixerController {
  audioContext: AudioContext;
  destinationNode: MediaStreamAudioDestinationNode;
  mixedStream: MediaStream;
  mixedAudioTrack: MediaStreamTrack | null;
  readonly localGainNode: GainNode | null;
  readonly tabGainNode: GainNode | null;
  readonly remoteGainNode: GainNode | null;
  addStream(stream: MediaStream, type: StreamMixerType): void;
  removeStream(type: StreamMixerType): void;
  setGain(type: StreamMixerType, value: number): void;
  cleanup(): Promise<void>;
}

/**
 * Creates an AudioContext mixer graph that routes streams cleanly into a
 * MediaStreamAudioDestinationNode.
 *
 * Prevents acoustic echo & feedback by never connecting to audioContext.destination.
 */
export function createAudioMixer(options?: AudioMixerOptions): AudioMixerController {
  let ctx = options?.audioContext;
  if (!ctx) {
    const AudioContextClass =
      typeof window !== 'undefined'
        ? window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        : undefined;

    if (!AudioContextClass) {
      throw new Error('AudioContext is not supported in this environment');
    }
    ctx = new AudioContextClass();
  }

  const destinationNode = ctx.createMediaStreamDestination();
  const nodesMap = new Map<StreamMixerType, StreamAudioNodes>();

  function addStream(stream: MediaStream, type: StreamMixerType) {
    if (!ctx) return;
    if (nodesMap.has(type)) {
      removeStream(type);
    }

    const audioTracks = stream.getAudioTracks ? stream.getAudioTracks() : [];
    if (audioTracks.length === 0) {
      return;
    }

    try {
      const sourceNode = ctx.createMediaStreamSource(stream);
      const gainNode = ctx.createGain();
      gainNode.gain.value = 1.0;

      // Connect source -> gain -> destinationNode ONLY (NEVER to ctx.destination)
      sourceNode.connect(gainNode);
      gainNode.connect(destinationNode);

      nodesMap.set(type, { sourceNode, gainNode });
    } catch {
      // Stream could not be bound into audio graph
    }
  }

  function removeStream(type: StreamMixerType) {
    const entry = nodesMap.get(type);
    if (entry) {
      try {
        entry.sourceNode.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      try {
        entry.gainNode.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      nodesMap.delete(type);
    }
  }

  function setGain(type: StreamMixerType, value: number) {
    const entry = nodesMap.get(type);
    if (entry) {
      entry.gainNode.gain.value = value;
    }
  }

  async function cleanup() {
    for (const type of Array.from(nodesMap.keys())) {
      removeStream(type);
    }

    if (ctx && ctx.state !== 'closed' && typeof ctx.close === 'function') {
      try {
        await ctx.close();
      } catch {
        // Ignore close errors
      }
    }
  }

  // Attach initial streams
  if (options?.localStream) {
    addStream(options.localStream, 'local');
  }
  if (options?.tabStream) {
    addStream(options.tabStream, 'tab');
  }
  if (options?.remoteStream) {
    addStream(options.remoteStream, 'remote');
  }

  return {
    audioContext: ctx,
    destinationNode,
    mixedStream: destinationNode.stream,
    get mixedAudioTrack() {
      const tracks = destinationNode.stream?.getAudioTracks();
      return tracks && tracks.length > 0 ? tracks[0] : null;
    },
    get localGainNode() {
      return nodesMap.get('local')?.gainNode ?? null;
    },
    get tabGainNode() {
      return nodesMap.get('tab')?.gainNode ?? null;
    },
    get remoteGainNode() {
      return nodesMap.get('remote')?.gainNode ?? null;
    },
    addStream,
    removeStream,
    setGain,
    cleanup,
  };
}
