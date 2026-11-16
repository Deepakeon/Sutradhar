'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  isOPFSSupported,
  appendRecordingChunk,
  finalizeRecording,
} from '@/lib/opfs/recording-storage';

export interface UseRoomRecordingOptions {
  interviewId: string;
  localStream: MediaStream | null;
  remoteStream?: MediaStream | null;
  autoPrompt?: boolean;
}

export interface UseRoomRecordingReturn {
  isPromptOpen: boolean;
  isRecording: boolean;
  recordingDuration: number;
  isSupported: boolean;
  notification: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  dismissPrompt: () => void;
  clearNotification: () => void;
}

function checkDesktopRecordingSupport(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return true;
  const userAgent = navigator.userAgent || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const hasDisplayMedia = Boolean(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
  const hasOPFS = isOPFSSupported();
  return !isMobile && hasDisplayMedia && hasOPFS;
}

export function useRoomRecording({
  interviewId,
  localStream,
  remoteStream,
  autoPrompt = true,
}: UseRoomRecordingOptions): UseRoomRecordingReturn {
  const [isSupported] = useState<boolean>(checkDesktopRecordingSupport);
  const [isPromptOpen, setIsPromptOpen] = useState<boolean>(
    () => checkDesktopRecordingSupport() && autoPrompt
  );
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [notification, setNotification] = useState<string | null>(() =>
    checkDesktopRecordingSupport()
      ? null
      : 'Local tab recording is only available on desktop browsers.'
  );

  const hasPromptedRef = useRef<boolean>(autoPrompt);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const durationRef = useRef<number>(0);

  // Open prompt when autoPrompt becomes true (e.g. room becomes active)
  useEffect(() => {
    if (autoPrompt && isSupported && !hasPromptedRef.current) {
      hasPromptedRef.current = true;
      setIsPromptOpen(true);
    }
  }, [autoPrompt, isSupported]);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const dismissPrompt = useCallback(() => {
    setIsPromptOpen(false);
    setNotification('Interview recording skipped. You can start it anytime using the record button.');
  }, []);

  const stopRecording = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    mediaRecorderRef.current = null;

    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach((track) => track.stop());
      displayStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        await audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }

    setIsRecording(false);

    try {
      const finalDurationMs = durationRef.current * 1000;
      await finalizeRecording(interviewId, finalDurationMs);
      setNotification('Interview Recording saved locally in your browser.');
    } catch (err) {
      console.error('Error finalizing OPFS recording:', err);
    }
  }, [interviewId]);

  const startRecording = useCallback(async () => {
    setIsPromptOpen(false);
    clearNotification();

    if (!isSupported) {
      setNotification('Local tab recording is only available on desktop browsers.');
      return;
    }

    try {
      // 1. Request current tab display media
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' } as any,
        audio: true,
      });
      displayStreamRef.current = displayStream;

      // Handle user terminating tab share from browser banner
      const videoTrack = displayStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          stopRecording();
        };
      }

      // 2. Mix audio using Web Audio API
      let compositeAudioTrack: MediaStreamTrack | null = null;
      try {
        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const destination = audioCtx.createMediaStreamDestination();

          if (localStream && localStream.getAudioTracks().length > 0) {
            const localSource = audioCtx.createMediaStreamSource(localStream);
            localSource.connect(destination);
          }

          if (remoteStream && remoteStream.getAudioTracks().length > 0) {
            const remoteSource = audioCtx.createMediaStreamSource(remoteStream);
            remoteSource.connect(destination);
          }

          if (displayStream.getAudioTracks().length > 0) {
            const displayAudioSource = audioCtx.createMediaStreamSource(displayStream);
            displayAudioSource.connect(destination);
          }

          const mixedTracks = destination.stream.getAudioTracks();
          if (mixedTracks.length > 0) {
            compositeAudioTrack = mixedTracks[0];
          }
        }
      } catch (audioErr) {
        console.warn('AudioContext mixing unavailable, falling back to direct tracks', audioErr);
      }

      if (!compositeAudioTrack) {
        compositeAudioTrack =
          localStream?.getAudioTracks()[0] || displayStream.getAudioTracks()[0] || null;
      }

      // 3. Assemble composite MediaStream
      const tracksToRecord: MediaStreamTrack[] = [];
      if (videoTrack) tracksToRecord.push(videoTrack);
      if (compositeAudioTrack) tracksToRecord.push(compositeAudioTrack);

      const compositeStream = new MediaStream(tracksToRecord);

      // 4. Determine supported mimeType
      const mimeType = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ].find((type) =>
        typeof MediaRecorder !== 'undefined' &&
        typeof MediaRecorder.isTypeSupported === 'function' &&
        MediaRecorder.isTypeSupported(type)
      ) || '';

      const recorder = new MediaRecorder(
        compositeStream,
        mimeType ? { mimeType } : undefined
      );
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          try {
            await appendRecordingChunk(interviewId, event.data);
          } catch (storageErr) {
            console.error('Failed to append recording chunk to OPFS:', storageErr);
          }
        }
      };

      recorder.start(3000); // 3-second slices
      setIsRecording(true);
      durationRef.current = 0;
      setRecordingDuration(0);

      // Start duration timer
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setRecordingDuration(durationRef.current);
      }, 1000);
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied')) {
        setNotification('Permission denied for tab recording. Call will proceed normally.');
      } else {
        setNotification('Unable to start recording. Call will proceed normally.');
      }
      setIsRecording(false);
    }
  }, [clearNotification, interviewId, isSupported, localStream, remoteStream, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (displayStreamRef.current) {
        displayStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    isPromptOpen,
    isRecording,
    recordingDuration,
    isSupported,
    notification,
    startRecording,
    stopRecording,
    dismissPrompt,
    clearNotification,
  };
}
