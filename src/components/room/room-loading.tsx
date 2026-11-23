import React from 'react';

export interface RoomLoadingProps {
  message?: string;
  className?: string;
}

export function RoomLoading({
  message = 'Connecting to Interview Room...',
  className = '',
}: RoomLoadingProps) {
  return (
    <div className={`min-h-screen bg-[#101010] flex items-center justify-center p-4 ${className}`.trim()}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#00d992] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-mono text-[#8b949e]">{message}</p>
      </div>
    </div>
  );
}
