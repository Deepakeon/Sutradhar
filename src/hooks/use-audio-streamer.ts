'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ChunkUploadMetadata } from '@/types/interview';

export interface UseAudioStreamerOptions {
  interviewId: string;
  profileId?: string;
  localStream: MediaStream | null;
  isCallActive: boolean;
  role: 'candidate' | 'interviewer';
  sessionStartedAt?: string | null;
}

export function useAudioStreamer({
  interviewId,
  profileId,
  localStream,
  isCallActive,
  role,
  sessionStartedAt,
}: UseAudioStreamerOptions) {
  const isRecording = isCallActive;
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [uploadedChunksCount, setUploadedChunksCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunkIndexRef = useRef<number>(0);
  const sessionStartedAtMsRef = useRef<number>(Date.now());
  const lastSliceStartMsRef = useRef<number>(Date.now());
  const supabase = useMemo(() => createClient(), []);

  // Safe helper to stop recorder
  const stopMediaRecorder = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore if already inactive
      }
    }
    mediaRecorderRef.current = null;
  }, []);

  // Sync sessionStartedAt reference timestamp
  useEffect(() => {
    if (sessionStartedAt) {
      const parsedMs = new Date(sessionStartedAt).getTime();
      if (!isNaN(parsedMs)) {
        sessionStartedAtMsRef.current = parsedMs;
      }
    }
  }, [sessionStartedAt]);

  // Manage recording timer when call is active
  useEffect(() => {
    if (!isCallActive) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setRecordingDuration((d) => d + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isCallActive]);

  // In-memory chunk dispatch with exponential backoff retry
  const uploadChunkWithRetry = useCallback(
    async (
      blob: Blob,
      metadata: ChunkUploadMetadata,
      attempt = 1
    ): Promise<void> => {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('audio', blob, `chunk_${metadata.chunkIndex}.webm`);
      formData.append('interview_id', metadata.interviewId);
      formData.append('role', metadata.role);
      if (metadata.profileId) {
        formData.append('profile_id', metadata.profileId);
      }
      formData.append('chunk_index', String(metadata.chunkIndex));
      formData.append('start_offset_ms', String(metadata.startOffsetMs));
      formData.append('end_offset_ms', String(metadata.endOffsetMs ?? metadata.startOffsetMs + 10000));

      try {
        const response = await fetch('/api/room/chunk-upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed with HTTP status ${response.status}`);
        }

        setUploadedChunksCount((c) => c + 1);
        setError(null);
      } catch (err: unknown) {
        const maxRetries = 3;
        if (attempt < maxRetries) {
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
          setTimeout(() => {
            uploadChunkWithRetry(blob, metadata, attempt + 1);
          }, backoffDelay);
        } else {
          const message =
            err instanceof Error ? err.message : 'Audio chunk upload failed after retries';
          setError(message);
          console.error(`Audio chunk ${metadata.chunkIndex} upload error:`, err);
        }
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  // Initialize and tear down MediaRecorder on isolated local microphone stream
  useEffect(() => {
    if (!isCallActive || !localStream) {
      stopMediaRecorder();
      return;
    }

    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) {
      return;
    }

    // Isolate ONLY the local microphone track (prevents remote audio bleed / acoustic echo)
    const isolatedAudioStream =
      typeof MediaStream !== 'undefined'
        ? new MediaStream(audioTracks)
        : (localStream as any);

    // Reset chunk counter and session start timer anchor on call connect
    chunkIndexRef.current = 0;
    const now = Date.now();
    if (!sessionStartedAt) {
      sessionStartedAtMsRef.current = now;
    }
    lastSliceStartMsRef.current = sessionStartedAtMsRef.current;

    // Determine Opus codec support
    let mimeType = 'audio/webm;codecs=opus';
    if (
      typeof MediaRecorder !== 'undefined' &&
      typeof MediaRecorder.isTypeSupported === 'function'
    ) {
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      }
    }

    try {
      const recorder = new MediaRecorder(
        isolatedAudioStream,
        mimeType ? { mimeType } : undefined
      );
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          const currentChunkIndex = chunkIndexRef.current++;
          const sliceNow = Date.now();
          // Accurate monotonic start offset from slice progression
          const startOffsetMs = Math.max(0, lastSliceStartMsRef.current - sessionStartedAtMsRef.current);
          const endOffsetMs = Math.max(startOffsetMs, sliceNow - sessionStartedAtMsRef.current);
          lastSliceStartMsRef.current = sliceNow;

          const metadata: ChunkUploadMetadata = {
            interviewId,
            profileId: profileId || '',
            role,
            chunkIndex: currentChunkIndex,
            startOffsetMs,
            endOffsetMs,
          };

          uploadChunkWithRetry(event.data, metadata);
        }
      };

      // Slice audio in 10-second (10,000ms) intervals
      recorder.start(10000);
    } catch (err: unknown) {
      console.error('Failed to initialize MediaRecorder:', err);
      setError('Failed to start audio recording from microphone');
    }

    return () => {
      stopMediaRecorder();
    };
  }, [interviewId, isCallActive, localStream, profileId, role, sessionStartedAt, stopMediaRecorder, uploadChunkWithRetry]);

  // Finalize interview session directly in Supabase
  const finalizeRecording = useCallback(async (): Promise<string | null> => {
    try {
      stopMediaRecorder();

      await supabase
        .schema('private')
        .from('interviews')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', interviewId);

      return null;
    } catch (err: unknown) {
      console.error('Finalize recording error:', err);
      return null;
    }
  }, [interviewId, stopMediaRecorder, supabase]);

  return {
    isRecording,
    recordingDuration,
    uploadedChunksCount,
    isUploading,
    error,
    finalizeRecording,
  };
}
