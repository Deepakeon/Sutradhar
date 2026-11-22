import React from 'react';
import { FiMicOff } from 'react-icons/fi';

export interface VideoBadgeProps {
  label: string;
  isMuted?: boolean;
  className?: string;
}

export function VideoBadge({ label, isMuted = false, className = '' }: VideoBadgeProps) {
  return (
    <div
      className={`absolute bottom-3 left-3 bg-[#101010]/80 backdrop-blur-md border border-[#3d3a39] px-3 py-1 rounded-md flex items-center gap-2 select-none ${className}`.trim()}
    >
      <span className="text-xs font-medium text-[#f2f2f2] capitalize">{label}</span>
      {isMuted && (
        <span
          title="Microphone Muted"
          className="flex items-center gap-1 text-[10px] bg-[#ff4d4f]/20 text-[#ff4d4f] border border-[#ff4d4f]/40 px-1.5 py-0.5 rounded font-mono"
        >
          <FiMicOff className="text-xs" />
          <span>MUTED</span>
        </span>
      )}
    </div>
  );
}
