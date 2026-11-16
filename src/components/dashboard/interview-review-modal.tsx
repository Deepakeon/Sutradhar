'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  getRecordingFile,
  getRecordingMetadata,
  deleteRecording,
  RecordingMetadata,
} from '@/lib/opfs/recording-storage';
import { useTranscription } from '@/hooks/use-transcription';

interface InterviewReviewModalProps {
  interviewId: string;
  interviewTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function InterviewReviewModal({
  interviewId,
  interviewTitle,
  isOpen,
  onClose,
  onDeleted,
}: InterviewReviewModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<RecordingMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    status: transcriptionStatus,
    downloadProgress,
    transcriptionProgress,
    transcript,
    error: transcriptionError,
    startTranscription,
  } = useTranscription({ interviewId });

  // Load recording file from OPFS
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function loadRecording() {
      try {
        const file = await getRecordingFile(interviewId);
        const meta = await getRecordingMetadata(interviewId);

        if (isMounted) {
          setVideoFile(file);
          setMetadata(meta);
          if (file) {
            const url = URL.createObjectURL(file);
            setVideoUrl(url);
          } else {
            setVideoUrl(null);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load recording from OPFS:', err);
        if (isMounted) setLoading(false);
      }
    }

    loadRecording();

    return () => {
      isMounted = false;
    };
  }, [interviewId, isOpen]);

  // Clean up Object URL
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const handleSeek = useCallback((seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      const playPromise = videoRef.current.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    }
  }, []);

  const handleDelete = useCallback(async () => {
    try {
      setIsDeleting(true);
      await deleteRecording(interviewId);
      setIsDeleting(false);
      setIsConfirmingDelete(false);
      if (onDeleted) onDeleted();
      onClose();
    } catch (err) {
      console.error('Failed to delete recording:', err);
      setIsDeleting(false);
    }
  }, [interviewId, onDeleted, onClose]);

  const handleDownloadTranscript = useCallback(
    (format: 'json' | 'txt') => {
      if (!transcript) return;
      let content = '';
      let mimeType = 'text/plain';
      let extension = 'txt';

      if (format === 'json') {
        content = JSON.stringify(transcript, null, 2);
        mimeType = 'application/json';
        extension = 'json';
      } else {
        content = transcript.segments
          .map((s) => `[${formatSeconds(s.start)} - ${formatSeconds(s.end)}] ${s.text}`)
          .join('\n\n');
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `interview-${interviewId}-transcript.${extension}`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [interviewId, transcript]
  );

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-fadeIn"
    >
      <div className="w-full max-w-4xl rounded-xl border border-[#3d3a39] bg-[#1a1a1a] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3d3a39] px-6 py-4 bg-[#101010]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono tracking-wider text-[#00d992]">
                Local Recording Review
              </span>
              {metadata?.status === 'repaired' && (
                <span className="text-[10px] bg-[#00d992]/20 text-[#00d992] border border-[#00d992]/40 px-1.5 py-0.5 rounded-sm">
                  Auto-Repaired
                </span>
              )}
            </div>
            <h2 className="text-lg font-semibold text-[#f2f2f2]">{interviewTitle}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[#8b949e] hover:bg-[#1a1a1a] hover:text-[#f2f2f2] transition-colors cursor-pointer"
            title="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00d992] border-t-transparent" />
            </div>
          ) : !videoUrl ? (
            <div className="rounded-lg border border-[#3d3a39] bg-[#101010] p-8 text-center text-[#8b949e]">
              <p>No local video recording found for this interview.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Video & Media Controls */}
              <div className="lg:col-span-7 space-y-4">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-[#3d3a39]">
                  <video
                    ref={videoRef}
                    data-testid="interview-video-player"
                    src={videoUrl}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Actions: Download Video & Delete */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#3d3a39]">
                  <div className="flex items-center gap-2">
                    <a
                      href={videoUrl}
                      download={`interview-${interviewId}-recording.webm`}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#00d992] hover:bg-[#2fd6a1] px-4 py-2 text-xs sm:text-sm font-semibold text-[#101010] transition-colors"
                    >
                      <span>📥</span>
                      <span>Download Video</span>
                    </a>
                  </div>

                  {!isConfirmingDelete ? (
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#ff4d4f]/40 bg-[#ff4d4f]/10 hover:bg-[#ff4d4f]/20 px-3 py-2 text-xs font-medium text-[#ff4d4f] transition-colors"
                    >
                      <span>🗑️</span>
                      <span>Delete Recording</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-[#ff4d4f]/10 border border-[#ff4d4f]/30 p-2 rounded-lg text-xs">
                      <span className="text-[#f2f2f2]">
                        Are you sure you want to delete this recording?
                      </span>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-[#ff4d4f] hover:bg-[#ff7875] text-white px-2.5 py-1 rounded-sm font-medium"
                      >
                        {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingDelete(false)}
                        className="text-[#8b949e] hover:text-[#f2f2f2] px-2 py-1"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: In-Browser Whisper Transcription */}
              <div className="lg:col-span-5 flex flex-col rounded-lg border border-[#3d3a39] bg-[#101010] p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-[#3d3a39] pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[#f2f2f2]">
                      Interview Transcript
                    </h3>
                    <p className="text-[11px] text-[#8b949e]">
                      Local Whisper model • 100% Client-Side
                    </p>
                  </div>

                  {transcript && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDownloadTranscript('txt')}
                        className="text-xs bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#3d3a39] text-[#f2f2f2] px-2.5 py-1 rounded-md"
                        title="Download as .txt"
                      >
                        TXT
                      </button>
                      <button
                        onClick={() => handleDownloadTranscript('json')}
                        className="text-xs bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#3d3a39] text-[#f2f2f2] px-2.5 py-1 rounded-md"
                        title="Download as .json"
                      >
                        JSON
                      </button>
                    </div>
                  )}
                </div>

                {/* Transcription States */}
                {transcriptionStatus === 'idle' && !transcript && (
                  <div className="flex flex-col items-center justify-center flex-1 py-8 text-center space-y-3">
                    <p className="text-xs text-[#8b949e] max-w-xs">
                      Generate a private, timestamped transcript using an in-browser Whisper speech model.
                    </p>
                    <button
                      onClick={() => videoFile && startTranscription(videoFile)}
                      disabled={!videoFile}
                      className="rounded-lg bg-[#00d992] hover:bg-[#2fd6a1] px-4 py-2 text-xs font-semibold text-[#101010] transition-colors"
                    >
                      Transcribe Interview
                    </button>
                  </div>
                )}

                {(transcriptionStatus === 'downloading-model' ||
                  transcriptionStatus === 'transcribing') && (
                  <div className="flex flex-col items-center justify-center flex-1 py-8 text-center space-y-4">
                    <div className="w-8 h-8 animate-spin rounded-full border-2 border-[#00d992] border-t-transparent" />
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-[#f2f2f2]">
                        {transcriptionStatus === 'downloading-model'
                          ? `Downloading speech model: ${downloadProgress.progress}% / 75MB`
                          : `Transcribing interview: ${transcriptionProgress}%`}
                      </p>
                      <div className="w-48 bg-[#1a1a1a] rounded-full h-1.5 border border-[#3d3a39] mx-auto overflow-hidden">
                        <div
                          className="bg-[#00d992] h-full transition-all duration-300"
                          style={{
                            width: `${
                              transcriptionStatus === 'downloading-model'
                                ? downloadProgress.progress
                                : transcriptionProgress
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {transcriptionStatus === 'error' && (
                  <div className="rounded-lg border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 p-3 text-center space-y-2">
                    <p className="text-xs text-[#ff4d4f]">
                      {transcriptionError || 'Transcription encountered an issue.'}
                    </p>
                    <button
                      onClick={() => videoFile && startTranscription(videoFile)}
                      className="text-xs underline text-[#f2f2f2] hover:text-[#00d992]"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Transcript Segments List */}
                {transcript && (
                  <div className="flex-1 overflow-y-auto space-y-2.5 max-h-80 pr-1 text-xs">
                    {transcript.segments.map((segment, idx) => (
                      <div
                        key={idx}
                        className="group flex items-start gap-2.5 p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => handleSeek(segment.start)}
                          className="font-mono text-[#00d992] hover:underline bg-[#00d992]/10 px-1.5 py-0.5 rounded-sm shrink-0"
                          title="Seek to timestamp"
                        >
                          {formatSeconds(segment.start)}
                        </button>
                        <p className="text-[#bdbdbd] group-hover:text-[#f2f2f2] leading-relaxed">
                          {segment.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
