'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { bufferChunk, clearBufferedChunk, getBufferedChunks } from '@/lib/audio/indexed-db-queue';

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

  const supabase = createClient();

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
          throw new Error(`Cloudinary upload failed: ${uploadRes.statusText}`);
        }

        const uploadData = await uploadRes.json();
        const cloudinaryUrl = uploadData.secure_url || uploadData.url;
        const cloudinaryPublicId = uploadData.public_id;

        // 3. Record chunk in Supabase
        await supabase.from('interview_chunks').insert({
          interview_id: interviewId,
          chunk_index: index,
          cloudinary_public_id: cloudinaryPublicId,
          cloudinary_url: cloudinaryUrl,
          duration_seconds: 30,
        });

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
      // Buffer in IndexedDB first
      await bufferChunk(interviewId, index, blob);

      // Primary uploader is the interviewer; candidate buffers for failover
      if (role === 'interviewer') {
        await uploadChunkToCloudinary(index, blob);
      }
    },
    [interviewId, role, uploadChunkToCloudinary]
  );

  // Setup Web Audio Mixing & Rolling Recording
  useEffect(() => {
    if (!isCallActive || !localStream) {
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

      const destination = ctx.createMediaStreamDestination();
      destinationRef.current = destination;

      // Connect local audio
      if (localStream.getAudioTracks().length > 0) {
        const localSource = ctx.createMediaStreamSource(localStream);
        localSource.connect(destination);
      }

      // Connect remote audio if available
      if (remoteStream && remoteStream.getAudioTracks().length > 0) {
        const remoteSource = ctx.createMediaStreamSource(remoteStream);
        remoteSource.connect(destination);
      }

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
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      setIsRecording(false);
    };
  }, [isCallActive, localStream, remoteStream, handleChunkProduced]);

  // Finalize full interview audio session
  const finalizeRecording = useCallback(async (): Promise<string | null> => {
    try {
      // Flush any pending chunks from IndexedDB if primary uploader or failover
      const pending = await getBufferedChunks(interviewId);
      for (const item of pending) {
        await uploadChunkToCloudinary(item.chunkIndex, item.blob);
      }

      // Call finalize endpoint to compute Cloudinary concatenated URL
      const res = await fetch('/api/recordings/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId }),
      });

      if (!res.ok) {
        throw new Error('Finalization request failed');
      }

      const data = await res.json();
      return data.masterRecordingUrl || null;
    } catch (err: unknown) {
      console.error('Finalize recording error:', err);
      return null;
    }
  }, [interviewId, uploadChunkToCloudinary]);

  return {
    isRecording,
    recordingDuration,
    uploadedChunksCount,
    isUploading,
    error,
    finalizeRecording,
  };
}
