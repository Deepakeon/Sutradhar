'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  saveTranscript,
  getTranscript,
  InterviewTranscriptData,
} from '@/lib/opfs/recording-storage';

export type TranscriptionStatus =
  | 'idle'
  | 'downloading-model'
  | 'transcribing'
  | 'completed'
  | 'error';

export interface UseTranscriptionOptions {
  interviewId: string;
}

export interface UseTranscriptionReturn {
  status: TranscriptionStatus;
  downloadProgress: { progress: number; loaded?: number; total?: number };
  transcriptionProgress: number;
  transcript: InterviewTranscriptData | null;
  error: string | null;
  startTranscription: (recordingBlob: Blob) => Promise<void>;
  resetTranscription: () => void;
}

export function useTranscription({
  interviewId,
}: UseTranscriptionOptions): UseTranscriptionReturn {
  const [status, setStatus] = useState<TranscriptionStatus>('idle');
  const [downloadProgress, setDownloadProgress] = useState<{
    progress: number;
    loaded?: number;
    total?: number;
  }>({ progress: 0 });
  const [transcriptionProgress, setTranscriptionProgress] = useState<number>(0);
  const [transcript, setTranscript] = useState<InterviewTranscriptData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);

  // Check if transcript already exists in OPFS
  useEffect(() => {
    let isMounted = true;
    async function loadSaved() {
      try {
        const saved = await getTranscript(interviewId);
        if (saved && isMounted) {
          setTranscript(saved);
          setStatus('completed');
        }
      } catch (err) {
        console.error('Failed to load existing transcript:', err);
      }
    }
    loadSaved();
    return () => {
      isMounted = false;
    };
  }, [interviewId]);

  const resetTranscription = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setStatus('idle');
    setDownloadProgress({ progress: 0 });
    setTranscriptionProgress(0);
    setError(null);
  }, []);

  const startTranscription = useCallback(
    async (recordingBlob: Blob) => {
      resetTranscription();
      setStatus('downloading-model');

      try {
        let worker: Worker;
        if (typeof Worker !== 'undefined') {
          // Instantiate worker
          worker = new Worker(
            new URL('@/lib/transcription/whisper-worker.ts', import.meta.url),
            { type: 'module' }
          );
        } else {
          throw new Error('Web Workers are not supported in this environment');
        }
        workerRef.current = worker;

        worker.onmessage = async (event: MessageEvent) => {
          const data = event.data || {};

          if (data.type === 'download-progress') {
            setStatus('downloading-model');
            setDownloadProgress({
              progress: data.progress || 0,
              loaded: data.loaded,
              total: data.total,
            });
          } else if (data.type === 'transcription-progress') {
            setStatus('transcribing');
            setTranscriptionProgress(data.progress || 0);
          } else if (data.type === 'complete') {
            const resultTranscript: InterviewTranscriptData = data.transcript;
            setTranscript(resultTranscript);
            setStatus('completed');
            try {
              await saveTranscript(interviewId, resultTranscript);
            } catch (saveErr) {
              console.error('Failed to save transcript to OPFS:', saveErr);
            }
          } else if (data.type === 'error') {
            setError(data.error || 'Transcription failed');
            setStatus('error');
          }
        };

        worker.onerror = (err: any) => {
          console.error('Worker error:', err);
          setError(err?.message || 'Worker execution error');
          setStatus('error');
        };

        // Extract audio array buffer
        const arrayBuffer = await recordingBlob.arrayBuffer();

        // Decode audio to Float32Array PCM if AudioContext is available
        let audioData: any = arrayBuffer;
        if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
          try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioCtx({ sampleRate: 16000 });
            const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
            audioData = decoded.getChannelData(0);
            await ctx.close();
          } catch {
            // If decodeAudioData fails on video container, pass arrayBuffer directly
            audioData = arrayBuffer;
          }
        }

        worker.postMessage({
          type: 'start',
          interviewId,
          audioBuffer: audioData,
        });
      } catch (err: any) {
        setError(err?.message || 'Failed to start transcription');
        setStatus('error');
      }
    },
    [interviewId, resetTranscription]
  );

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  return {
    status,
    downloadProgress,
    transcriptionProgress,
    transcript,
    error,
    startTranscription,
    resetTranscription,
  };
}
