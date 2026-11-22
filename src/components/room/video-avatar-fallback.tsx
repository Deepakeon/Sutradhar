import React, { ReactNode } from 'react';

export interface VideoAvatarFallbackProps {
  initial: string;
  label: ReactNode;
  accent?: 'primary' | 'neutral';
  className?: string;
}

export function VideoAvatarFallback({
  initial,
  label,
  accent = 'neutral',
  className = '',
}: VideoAvatarFallbackProps) {
  const accentClass =
    accent === 'primary'
      ? 'border-[#3d3a39] text-[#00d992]'
      : 'border-[#3d3a39] text-[#f2f2f2]';

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`.trim()}>
      <div
        className={`w-20 h-20 rounded-full bg-[#101010] border flex items-center justify-center text-2xl font-bold uppercase ${accentClass}`}
      >
        {initial}
      </div>
      <p className="text-sm font-medium text-[#8b949e]">{label}</p>
    </div>
  );
}
