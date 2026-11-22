import React from 'react';
import { FiCheck, FiExternalLink } from 'react-icons/fi';
import { Action } from '@/types/types';

export interface RoomCallEndedProps {
  title?: string;
  description?: string;
  statusLabel?: string;
  uploadedChunksCount?: number;
  isFinalizing?: boolean;
  action?: Action;
  className?: string;
}

export function RoomCallEnded({
  title = 'Interview Session Concluded',
  description = 'The session has ended. All audio chunks were securely streamed.',
  statusLabel = 'Completed',
  uploadedChunksCount,
  isFinalizing = false,
  action,
  className = '',
}: RoomCallEndedProps) {
  return (
    <div className={`min-h-screen bg-[#101010] flex items-center justify-center p-4 ${className}`.trim()}>
      <div className="max-w-md w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-xl p-6 sm:p-8 text-center shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-[#00d992]/20 text-[#00d992] flex items-center justify-center mx-auto mb-4 text-xl">
          <FiCheck className="text-2xl" />
        </div>
        <h2 className="text-xl font-bold text-[#f2f2f2] mb-2">{title}</h2>
        {description && (
          <p className="text-sm text-[#8b949e] mb-6">{description}</p>
        )}

        <div className="bg-[#101010] border border-[#3d3a39] rounded-lg p-4 mb-6 text-left text-xs font-mono space-y-2">
          <div className="flex justify-between">
            <span className="text-[#8b949e]">Status:</span>
            <span className="text-[#00d992] uppercase font-bold">{statusLabel}</span>
          </div>
          {typeof uploadedChunksCount === 'number' && (
            <div className="flex justify-between">
              <span className="text-[#8b949e]">Audio Chunks:</span>
              <span className="text-[#f2f2f2]">{uploadedChunksCount} uploaded</span>
            </div>
          )}
          {isFinalizing ? (
            <div className="flex items-center gap-2 text-[#ffaa00] pt-1">
              <span className="w-2 h-2 rounded-full bg-[#ffaa00] animate-ping" />
              <span>Assembling master recording...</span>
            </div>
          ) : null}
        </div>

        {!!action && (
          <button
            onClick={action.onAction}
            className="w-full bg-[#00d992] hover:bg-[#2fd6a1] text-[#101010] font-semibold text-sm py-2.5 rounded-lg transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

// Alias for generic use
export const RoomEnded = RoomCallEnded;
