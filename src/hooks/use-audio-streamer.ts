'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UseAudioStreamerOptions {
  interviewId: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isCallActive: boolean;
  role: 'candidate' | 'interviewer';
}

export function useAudioStreamer({
  interviewId,
  isCallActive,
}: UseAudioStreamerOptions) {
  const isRecording = isCallActive;
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [uploadedChunksCount] = useState(0);
  const [isUploading] = useState(false);
  const [error] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = useMemo(() => createClient(), []);

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

  // Finalize interview session directly in Supabase
  const finalizeRecording = useCallback(async (): Promise<string | null> => {
    try {
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
  }, [interviewId, supabase]);

  return {
    isRecording,
    recordingDuration,
    uploadedChunksCount,
    isUploading,
    error,
    finalizeRecording,
  };
}

