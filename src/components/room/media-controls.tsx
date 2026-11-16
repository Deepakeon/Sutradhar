'use client';

import React from 'react';

interface MediaControlsProps {
  isMicMuted: boolean;
  isCameraOff: boolean;
  isRecording?: boolean;
  isRecordingSupported?: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onOpenSettings: () => void;
  onEndCall: () => void;
  onToggleRecording?: () => void;
}

export function MediaControls({
  isMicMuted,
  isCameraOff,
  isRecording = false,
  isRecordingSupported = true,
  onToggleMic,
  onToggleCamera,
  onOpenSettings,
  onEndCall,
  onToggleRecording,
}: MediaControlsProps) {
  return (
    <footer className="w-full bg-[#101010] border-t border-[#3d3a39] py-3 px-4 flex items-center justify-center gap-3 sm:gap-4 select-none">
      {/* Microphone Toggle */}
      <button
        onClick={onToggleMic}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
          isMicMuted
            ? 'bg-[#ff4d4f]/20 text-[#ff4d4f] border border-[#ff4d4f]/40 hover:bg-[#ff4d4f]/30'
            : 'bg-[#1a1a1a] text-[#f2f2f2] border border-[#3d3a39] hover:border-[#8b949e]'
        }`}
        title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
      >
        <span className="text-base">{isMicMuted ? '🔇' : '🎙️'}</span>
        <span className="hidden sm:inline">{isMicMuted ? 'Unmute' : 'Mute'}</span>
      </button>

      {/* Camera Toggle */}
      <button
        onClick={onToggleCamera}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
          isCameraOff
            ? 'bg-[#ff4d4f]/20 text-[#ff4d4f] border border-[#ff4d4f]/40 hover:bg-[#ff4d4f]/30'
            : 'bg-[#1a1a1a] text-[#f2f2f2] border border-[#3d3a39] hover:border-[#8b949e]'
        }`}
        title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
      >
        <span className="text-base">{isCameraOff ? '🚫' : '📹'}</span>
        <span className="hidden sm:inline">{isCameraOff ? 'Camera On' : 'Camera Off'}</span>
      </button>

      {/* Recording Toggle */}
      {onToggleRecording && (
        <button
          onClick={onToggleRecording}
          disabled={!isRecordingSupported}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            !isRecordingSupported
              ? 'opacity-50 cursor-not-allowed bg-[#1a1a1a] text-[#8b949e] border border-[#3d3a39]'
              : isRecording
              ? 'bg-[#ff4d4f]/20 text-[#ff4d4f] border border-[#ff4d4f]/40 hover:bg-[#ff4d4f]/30'
              : 'bg-[#1a1a1a] text-[#f2f2f2] border border-[#3d3a39] hover:border-[#8b949e]'
          }`}
          title={
            !isRecordingSupported
              ? 'Tab recording desktop-only'
              : isRecording
              ? 'Stop Interview Recording'
              : 'Start Interview Recording'
          }
        >
          <span className="text-base">{isRecording ? '⏹️' : '⏺️'}</span>
          <span className="hidden sm:inline">
            {isRecording ? 'Stop Rec' : 'Record'}
          </span>
        </button>
      )}

      {/* Device Settings */}
      <button
        onClick={onOpenSettings}
        className="flex items-center gap-2 bg-[#1a1a1a] text-[#f2f2f2] border border-[#3d3a39] hover:border-[#8b949e] px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
        title="Audio & Video Settings"
      >
        <span className="text-base">⚙️</span>
        <span className="hidden sm:inline">Settings</span>
      </button>

      {/* End Call */}
      <button
        onClick={onEndCall}
        className="flex items-center gap-2 bg-[#ff4d4f] hover:bg-[#ff7875] text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-all shadow-md active:scale-95"
        title="Leave Interview Call"
      >
        <span className="text-base">📞</span>
        <span>End Call</span>
      </button>
    </footer>
  );
}
