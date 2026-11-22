'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  OpfsRecordingStorage,
  OpfsRecordingWriter,
  RecordingMetadata,
  getOpfsStorage,
} from '@/lib/recording';
import {
  createAudioMixer,
  detectRecordingEnvironment,
  AudioMixerController,
} from '@/lib/audio/tab-audio-mixer';

export interface UseTabRecorderOptions {
  interviewId: string;
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
  timesliceMs?: number; // default 10000 (10s)
  storage?: OpfsRecordingStorage;
  onRecordingStart?: () => void;
  onRecordingStop?: (metadata: RecordingMetadata | null) => void;
  onRecordingError?: (error: Error) => void;
}

export interface UseTabRecorderReturn {
  isSupported: boolean;
  unsupportedReason?: string;
  isRecording: boolean;
  isStarting: boolean;
  isFinalizing: boolean;
  duration: number;
  error: string | null;
  displayStream: MediaStream | null;
  compositeStream: MediaStream | null;
  metadata: RecordingMetadata | null;
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<RecordingMetadata | null>;
  clearError: () => void;
}

/**
 * Returns the best supported container and codec MIME type for MediaRecorder.
 */
function getSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return 'video/webm';
  }
  const candidateTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm',
    'video/mp4',
  ];
  for (const type of candidateTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return 'video/webm';
}

/**
 * Client hook for browser tab screen capture and composite audio mixing
 * streaming directly into OPFS storage.
 */
export function useTabRecorder({
  interviewId,
  localStream,
  remoteStream,
  timesliceMs = 10000,
  storage,
  onRecordingStart,
  onRecordingStop,
  onRecordingError,
}: UseTabRecorderOptions): UseTabRecorderReturn {
  // Environment support detection
  const envSupport = useMemo(() => detectRecordingEnvironment(), []);
  const [isSupported] = useState<boolean>(envSupport.supported);
  const [unsupportedReason] = useState<string | undefined>(envSupport.reason);

  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [displayStream, setDisplayStream] = useState<MediaStream | null>(null);
  const [compositeStream, setCompositeStream] = useState<MediaStream | null>(null);
  const [metadata, setMetadata] = useState<RecordingMetadata | null>(null);

  // Mutable internal references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const writerRef = useRef<OpfsRecordingWriter | null>(null);
  const mixerRef = useRef<AudioMixerController | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const isStartingRef = useRef<boolean>(false);
  const isStoppingRef = useRef<boolean>(false);

  // Callback / props reference container
  const optionsRef = useRef({
    interviewId,
    localStream,
    remoteStream,
    timesliceMs,
    storage,
    onRecordingStart,
    onRecordingStop,
    onRecordingError,
  });

  useEffect(() => {
    optionsRef.current = {
      interviewId,
      localStream,
      remoteStream,
      timesliceMs,
      storage,
      onRecordingStart,
      onRecordingStop,
      onRecordingError,
    };
  }, [
    interviewId,
    localStream,
    remoteStream,
    timesliceMs,
    storage,
    onRecordingStart,
    onRecordingStop,
    onRecordingError,
  ]);

  // Dynamically update audio streams in mixer if streams mutate during call
  useEffect(() => {
    if (mixerRef.current && isRecording) {
      if (localStream) {
        mixerRef.current.addStream(localStream, 'local');
      } else {
        mixerRef.current.removeStream('local');
      }
    }
  }, [localStream, isRecording]);

  useEffect(() => {
    if (mixerRef.current && isRecording) {
      if (remoteStream) {
        mixerRef.current.addStream(remoteStream, 'remote');
      } else {
        mixerRef.current.removeStream('remote');
      }
    }
  }, [remoteStream, isRecording]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Finalizes the active recording, flushes OPFS chunks, patches EBML, and tears down tab streams.
   */
  const stopRecording = useCallback(async (): Promise<RecordingMetadata | null> => {
    if (isStoppingRef.current || !writerRef.current) {
      return null;
    }
    isStoppingRef.current = true;
    setIsFinalizing(true);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    let finalizedResult: RecordingMetadata | null = null;
    try {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        await new Promise<void>((resolve) => {
          recorder.onstop = () => resolve();
          try {
            recorder.stop();
          } catch {
            resolve();
          }
        });
      }

      // Wait for any queued chunk writes to finish
      await writeQueueRef.current;

      const durationMs = startTimeRef.current > 0 ? Date.now() - startTimeRef.current : 0;

      // Finalize OPFS container with patched EBML headers and duration
      if (writerRef.current) {
        finalizedResult = await writerRef.current.finalize(durationMs);
        writerRef.current = null;
      }

      setMetadata(finalizedResult);
      optionsRef.current.onRecordingStop?.(finalizedResult);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj.message);
      optionsRef.current.onRecordingError?.(errorObj);
    } finally {
      // Clean up mixer
      if (mixerRef.current) {
        await mixerRef.current.cleanup();
        mixerRef.current = null;
      }

      // Clean up display tracks ONLY (never localStream or remoteStream tracks)
      if (displayStreamRef.current) {
        displayStreamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // Ignore track stop errors
          }
        });
        displayStreamRef.current = null;
      }

      mediaRecorderRef.current = null;
      setIsRecording(false);
      setIsFinalizing(false);
      setDisplayStream(null);
      setCompositeStream(null);
      isStoppingRef.current = false;
    }

    return finalizedResult;
  }, []);

  const stopRecordingRef = useRef(stopRecording);
  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  /**
   * Prompts user for current tab capture, connects Web Audio mixer, and begins streaming chunks to OPFS.
   */
  const startRecording = useCallback(async (): Promise<boolean> => {
    if (isRecording || isStartingRef.current) {
      return false;
    }

    const currentEnv = detectRecordingEnvironment();
    if (!currentEnv.supported) {
      const msg = currentEnv.reason || 'Tab recording is not supported in this environment';
      setError(msg);
      optionsRef.current.onRecordingError?.(new Error(msg));
      return false;
    }

    isStartingRef.current = true;
    setIsStarting(true);
    setError(null);

    let capturedDisplayStream: MediaStream | null = null;
    let mixer: AudioMixerController | null = null;

    try {
      // 1. Request tab display media with preferCurrentTab and browser surface
      const displayOptions = {
        video: {
          displaySurface: 'browser',
        },
        audio: true,
        preferCurrentTab: true,
        selfBrowserSurface: 'include',
        systemAudio: 'include',
        surfaceSwitching: 'include',
      };

      capturedDisplayStream = await navigator.mediaDevices.getDisplayMedia(
        displayOptions as unknown as DisplayMediaStreamOptions
      );

      const videoTracks = capturedDisplayStream.getVideoTracks();
      if (!videoTracks || videoTracks.length === 0) {
        throw new Error('No video track available from captured display media');
      }
      const videoTrack = videoTracks[0];

      // 2. Mix local mic, tab audio, and remote audio without speaker loopback
      mixer = createAudioMixer({
        localStream: optionsRef.current.localStream,
        tabStream: capturedDisplayStream,
        remoteStream: optionsRef.current.remoteStream,
      });
      mixerRef.current = mixer;
      displayStreamRef.current = capturedDisplayStream;

      // 3. Assemble composite stream (video + mixed audio)
      const compositeTracks: MediaStreamTrack[] = [videoTrack];
      if (mixer.mixedAudioTrack) {
        compositeTracks.push(mixer.mixedAudioTrack);
      }
      const newCompositeStream = new MediaStream(compositeTracks);

      // 4. Open OPFS recording session
      const storageEngine = optionsRef.current.storage || getOpfsStorage();
      const writer = await storageEngine.startRecording(optionsRef.current.interviewId);
      writerRef.current = writer;

      // 5. Initialize MediaRecorder on composite stream with 10s timeslice
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(newCompositeStream, { mimeType });
      mediaRecorderRef.current = recorder;

      writeQueueRef.current = Promise.resolve();
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          writeQueueRef.current = writeQueueRef.current.then(async () => {
            try {
              await writer.appendChunk(event.data);
            } catch (chunkErr) {
              console.error('Failed to append recording chunk to OPFS:', chunkErr);
            }
          });
        }
      };

      // 6. Listen to native "Stop sharing" event on video track
      const handleVideoEnded = async () => {
        try {
          await stopRecordingRef.current();
        } catch {
          // Ignore error during event-driven stop
        }
      };
      videoTrack.addEventListener('ended', handleVideoEnded);

      const sliceInterval = optionsRef.current.timesliceMs ?? 10000;
      recorder.start(sliceInterval);

      startTimeRef.current = Date.now();
      setDisplayStream(capturedDisplayStream);
      setCompositeStream(newCompositeStream);
      setIsRecording(true);
      setDuration(0);

      // Start duration counter
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);

      optionsRef.current.onRecordingStart?.();
      return true;
    } catch (err: unknown) {
      if (capturedDisplayStream) {
        capturedDisplayStream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {
            // Ignore track stop errors
          }
        });
      }
      if (mixer) {
        await mixer.cleanup();
        mixerRef.current = null;
      }
      if (writerRef.current) {
        await writerRef.current.close();
        writerRef.current = null;
      }

      const errorObj = err instanceof Error ? err : new Error(String(err));
      let message = errorObj.message;
      if (errorObj.name === 'NotAllowedError') {
        message = 'Permission denied for tab sharing';
      }
      setError(message);
      optionsRef.current.onRecordingError?.(errorObj);
      return false;
    } finally {
      isStartingRef.current = false;
      setIsStarting(false);
    }
  }, [isRecording]);

  // Teardown on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Ignore stop errors on unmount
        }
      }
      if (writerRef.current) {
        writerRef.current.close().catch(() => {});
        writerRef.current = null;
      }
      if (mixerRef.current) {
        mixerRef.current.cleanup().catch(() => {});
        mixerRef.current = null;
      }
      if (displayStreamRef.current) {
        displayStreamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // Ignore track stop errors on unmount
          }
        });
        displayStreamRef.current = null;
      }
    };
  }, []);

  return {
    isSupported,
    unsupportedReason,
    isRecording,
    isStarting,
    isFinalizing,
    duration,
    error,
    displayStream,
    compositeStream,
    metadata,
    startRecording,
    stopRecording,
    clearError,
  };
}
