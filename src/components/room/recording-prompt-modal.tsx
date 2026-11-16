'use client';

import React from 'react';

interface RecordingPromptModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function RecordingPromptModal({
  isOpen,
  onConfirm,
  onDismiss,
}: RecordingPromptModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="recording-prompt-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none animate-fadeIn"
    >
      <div className="w-full max-w-md rounded-xl border border-[#3d3a39] bg-[#1a1a1a] p-6 shadow-2xl text-left">
        {/* Icon & Title */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#00d992]/10 border border-[#00d992]/30 text-[#00d992]">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <h2
              id="recording-prompt-title"
              className="text-base font-semibold text-[#f2f2f2]"
            >
              Record Your Practice Interview?
            </h2>
            <p className="text-xs text-[#8b949e] mt-0.5">
              Local, private browser recording
            </p>
          </div>
        </div>

        {/* Plain Language Reassurance Body */}
        <div className="space-y-2.5 text-sm text-[#bdbdbd] mb-6">
          <p>
            To capture your full interview visual interface and audio for post-interview
            review, Sutradhar will request browser tab sharing.
          </p>
          <div className="rounded-lg border border-[#3d3a39] bg-[#101010] p-3 text-xs space-y-1.5 text-[#8b949e]">
            <div className="flex items-center gap-2 text-[#00d992] font-medium">
              <span>🔒 100% Client-Side Privacy</span>
            </div>
            <p>
              Your recording is stored strictly inside your browser (OPFS). No video or
              audio is ever uploaded to our servers or saved in the cloud.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg border border-[#3d3a39] bg-transparent px-4 py-2 text-xs sm:text-sm font-medium text-[#bdbdbd] hover:bg-[#101010] hover:text-[#f2f2f2] transition-colors"
          >
            Skip for Now
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-[#00d992] hover:bg-[#2fd6a1] px-4 py-2 text-xs sm:text-sm font-semibold text-[#101010] shadow-sm transition-colors"
          >
            Allow Recording
          </button>
        </div>
      </div>
    </div>
  );
}
