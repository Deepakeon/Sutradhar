'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  bufferChunk,
  clearBufferedChunk,
  getBufferedChunks,
  clearAllInterviewChunks,
} from '@/lib/audio/indexed-db-queue';

interface UseAudioStreamerOptions {
  interviewId: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isCallActive: boolean;
  role: 'candidate' | 'interviewer';
}

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
  if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
  return 'audio/webm';
}

export function useAudioStreamer({
  interviewId,
  localStream,
  remoteStream,
  isCallActive,
  role,
}: UseAudioStreamerOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [uploadedChunksCount, setUploadedChunksCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const activeRecorderRef = useRef<MediaRecorder | null>(null);
  const isRunningRef = useRef(false);
  const chunkIndexRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const localSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const remoteSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const dummyAudioRef = useRef<HTMLAudioElement | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // Upload single chunk to Cloudinary
  const uploadChunkToCloudinary = useCallback(
    async (index: number, blob: Blob): Promise<string | null> => {
      try {
        setIsUploading(true);
        // 1. Get signed upload parameters from server
        const signRes = await fetch('/api/recordings/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interviewId, chunkIndex: index }),
        });

        if (!signRes.ok) {
          const errData = await signRes.json();
          throw new Error(errData.error || 'Failed to sign upload');
        }

        const { signature, timestamp, folder, publicId, apiKey, cloudName } = await signRes.json();

        // 2. Direct upload to Cloudinary API
        const formData = new FormData();
        formData.append('file', blob, `chunk_${index}.webm`);
        formData.append('api_key', apiKey);
        formData.append('timestamp', timestamp.toString());
        formData.append('signature', signature);
        formData.append('folder', folder);
        formData.append('public_id', publicId);
        formData.append('resource_type', 'video');

        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const errorJson = await uploadRes.json().catch(() => null);
          const detailedMsg = errorJson?.error?.message || uploadRes.statusText;
          if (uploadRes.status === 400) {
            await clearBufferedChunk(interviewId, index);
          }
          throw new Error(`Cloudinary upload failed: ${detailedMsg}`);
        }

        const uploadData = await uploadRes.json();
        const cloudinaryUrl = uploadData.secure_url || uploadData.url;
        const cloudinaryPublicId = uploadData.public_id;

        // 3. Record chunk in private.interview_chunks (upsert with ignoreDuplicates to prevent 409 collisions)
        await supabase
          .schema('private')
          .from('interview_chunks')
          .upsert(
            {
              interview_id: interviewId,
              chunk_index: index,
              cloudinary_public_id: cloudinaryPublicId,
              cloudinary_url: cloudinaryUrl,
              duration_seconds: 30,
            },
            { onConflict: 'interview_id,chunk_index', ignoreDuplicates: true }
          );

        // 4. Clear from local IndexedDB
        await clearBufferedChunk(interviewId, index);
        setUploadedChunksCount((c) => c + 1);

        return cloudinaryUrl;
      } catch (err: unknown) {
        console.error(`Chunk ${index} upload error:`, err);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [interviewId, supabase]
  );

  // Process produced chunk
  const handleChunkProduced = useCallback(
    async (index: number, blob: Blob) => {
      // 1. Both interviewer and candidate buffer locally in IndexedDB
      await bufferChunk(interviewId, index, blob);

      // 2. Only interviewer actively uploads during live call (candidate is passive backup)
      if (role === 'interviewer') {
        await uploadChunkToCloudinary(index, blob);
      }
    },
    [interviewId, role, uploadChunkToCloudinary]
  );

  // Setup Web Audio Mixing & Rolling Recording
  useEffect(() => {
    // Both interviewer and candidate run the audio recorder (candidate acts as passive backup)
    if (!isCallActive) {
      if (isRunningRef.current) {
        isRunningRef.current = false;
        if (activeRecorderRef.current && activeRecorderRef.current.state === 'recording') {
          activeRecorderRef.current.stop();
        }
        setTimeout(() => setIsRecording(false), 0);
      }
      return;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      // Ensure AudioContext is actively running (Chrome defaults to suspended)
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const destination = ctx.createMediaStreamDestination();
      destinationRef.current = destination;

      isRunningRef.current = true;
      setTimeout(() => setIsRecording(true), 0);

      // Rolling chunk recorder loop (30-second cycles)
      const mimeType = getSupportedMimeType();

      const recordNextSlice = () => {
        if (!isRunningRef.current || !destinationRef.current) return;

        try {
          const recorder = new MediaRecorder(destinationRef.current.stream, { mimeType });
          activeRecorderRef.current = recorder;
          const chunks: Blob[] = [];

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
          };

          recorder.onstop = async () => {
            if (chunks.length > 0) {
              const fullBlob = new Blob(chunks, { type: mimeType });
              // Guard against empty / stub headers (<1KB) when stopped prematurely
                const currentIdx = chunkIndexRef.current++;
                await handleChunkProduced(currentIdx, fullBlob);
              
            }
            if (isRunningRef.current) {
              recordNextSlice();
            }
          };

          recorder.start();

          // 30 seconds slice
          setTimeout(() => {
            if (recorder.state === 'recording') {
              recorder.stop();
            }
          }, 30000);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'MediaRecorder failed';
          setError(msg);
        }
      };

      recordNextSlice();

      // Duration counter
      timerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AudioContext initialization failed';
      setTimeout(() => setError(msg), 0);
    }

    return () => {
      isRunningRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (activeRecorderRef.current && activeRecorderRef.current.state === 'recording') {
        activeRecorderRef.current.stop();
      }
      if (localSourceNodeRef.current) {
        try { localSourceNodeRef.current.disconnect(); } catch {}
        localSourceNodeRef.current = null;
      }
      if (remoteSourceNodeRef.current) {
        try { remoteSourceNodeRef.current.disconnect(); } catch {}
        remoteSourceNodeRef.current = null;
      }
      if (dummyAudioRef.current) {
        dummyAudioRef.current.srcObject = null;
        dummyAudioRef.current.remove();
        dummyAudioRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      setIsRecording(false);
    };
  }, [isCallActive, role, handleChunkProduced]);

  // Dynamically wire local stream into AudioContext mixer
  useEffect(() => {
    const ctx = audioContextRef.current;
    const destination = destinationRef.current;
    if (!ctx || !destination || ctx.state === 'closed') return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (localSourceNodeRef.current) {
      try { localSourceNodeRef.current.disconnect(); } catch {}
      localSourceNodeRef.current = null;
    }

    if (localStream && localStream.getAudioTracks().length > 0) {
      try {
        const source = ctx.createMediaStreamSource(localStream);
        source.connect(destination);
        localSourceNodeRef.current = source;
      } catch (err) {
        console.warn('Failed to connect local audio track to mixer:', err);
      }
    }
  }, [localStream]);

  // Dynamically wire remote stream into AudioContext mixer (with Chromium wake-up fix)
  useEffect(() => {
    const ctx = audioContextRef.current;
    const destination = destinationRef.current;
    if (!ctx || !destination || ctx.state === 'closed') return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (remoteSourceNodeRef.current) {
      try { remoteSourceNodeRef.current.disconnect(); } catch {}
      remoteSourceNodeRef.current = null;
    }

    if (remoteStream && remoteStream.getAudioTracks().length > 0) {
      try {
        // Chromium WebRTC fix: wake up media engine with hidden audio element
        if (!dummyAudioRef.current && typeof document !== 'undefined') {
          const el = document.createElement('audio');
          el.muted = true;
          el.setAttribute('playsinline', 'true');
          el.style.display = 'none';
          document.body.appendChild(el);
          dummyAudioRef.current = el;
        }
        if (dummyAudioRef.current) {
          dummyAudioRef.current.srcObject = remoteStream;
          dummyAudioRef.current.play().catch(() => {});
        }

        const source = ctx.createMediaStreamSource(remoteStream);
        source.connect(destination);
        remoteSourceNodeRef.current = source;
      } catch (err) {
        console.warn('Failed to connect remote audio track to mixer:', err);
      }
    }
  }, [remoteStream]);

  // Finalize full interview audio session
  const finalizeRecording = useCallback(async (): Promise<string | null> => {
    try {
      // 1. If active recorder is running, await final slice flush
      if (activeRecorderRef.current && activeRecorderRef.current.state === 'recording') {
        const recorder = activeRecorderRef.current;
        await new Promise<void>((resolve) => {
          const originalOnStop = recorder.onstop;
          recorder.onstop = async (e) => {
            if (originalOnStop) {
              await (originalOnStop as (ev: Event) => Promise<void>)(e);
            }
            resolve();
          };
          recorder.stop();
        });
      }

      await new Promise((r) => setTimeout(r, 100));

      // 2. Candidate failover check
      if (role === 'candidate') {
        const { data: interview } = await supabase
          .schema('private')
          .from('interviews')
          .select('status, master_recording_url')
          .eq('id', interviewId)
          .single();

        if (interview?.master_recording_url && interview?.status === 'completed') {
          // Interviewer already finalized cleanly: clear local candidate backup and return master URL
          await clearAllInterviewChunks(interviewId);
          return interview.master_recording_url;
        }

        // Failover: Interviewer dropped or crashed before finalizing
        // Candidate uploads missing chunks that were not yet uploaded
        const { data: existingChunks } = await supabase
          .schema('private')
          .from('interview_chunks')
          .select('chunk_index')
          .eq('interview_id', interviewId);

        const existingIndices = new Set((existingChunks || []).map((c) => c.chunk_index));
        const pending = await getBufferedChunks(interviewId);

        for (const item of pending) {
          if (!existingIndices.has(item.chunkIndex)) {
            await uploadChunkToCloudinary(item.chunkIndex, item.blob);
          }
        }
      } else {
        // Interviewer: Flush all pending buffered chunks
        const pending = await getBufferedChunks(interviewId);
        for (const item of pending) {
          await uploadChunkToCloudinary(item.chunkIndex, item.blob);
        }
      }

      // 3. Call finalize endpoint to compute Cloudinary concatenated URL
      const res = await fetch('/api/recordings/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId }),
      });

      if (!res.ok) {
        throw new Error('Finalization request failed');
      }

      const data = await res.json();
      await clearAllInterviewChunks(interviewId);
      return data.masterRecordingUrl || null;
    } catch (err: unknown) {
      console.error('Finalize recording error:', err);
      return null;
    }
  }, [interviewId, role, supabase, uploadChunkToCloudinary]);

  return {
    isRecording,
    recordingDuration,
    uploadedChunksCount,
    isUploading,
    error,
    finalizeRecording,
  };
}
