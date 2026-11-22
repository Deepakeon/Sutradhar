import React from 'react';
import { FiVolume2 } from 'react-icons/fi';

export interface AutoplayBannerProps {
  onUnlock: () => void;
  className?: string;
}

export function AutoplayBanner({ onUnlock, className = '' }: AutoplayBannerProps) {
  return (
    <div className={`absolute inset-x-4 top-4 z-20 flex justify-center ${className}`.trim()}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onUnlock();
        }}
        className="px-3.5 py-1.5 bg-[#00d992] hover:bg-[#2fd6a1] text-[#101010] font-mono text-xs font-semibold rounded-md shadow-lg animate-pulse flex items-center gap-2 border border-[#10b981]"
      >
        <FiVolume2 className="text-sm" /> Tap to enable partner audio & video
      </button>
    </div>
  );
}
