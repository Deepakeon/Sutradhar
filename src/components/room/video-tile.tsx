'use client';

import { useRef, useEffect, useCallback, ReactNode } from 'react';

export interface VideoTileProps {
  stream: MediaStream | null;
  isVideoOff?: boolean;
  mirrored?: boolean;
  muted?: boolean;
  fallback?: ReactNode;
  badge?: ReactNode;
  banner?: ReactNode;
  onClick?: () => void;
  onPlaySuccess?: () => void;
  onPlayError?: (err: unknown) => void;
  className?: string;
}

export function VideoTile({
  stream,
  isVideoOff = false,
  mirrored = false,
  muted = false,
  fallback,
  badge,
  banner,
  onClick,
  onPlaySuccess,
  onPlayError,
  className = '',
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const syncStream = useCallback(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    if (!isVideoOff) {
      const playPromise = video.play();
      if (playPromise !== undefined && typeof playPromise?.catch === 'function') {
        playPromise
          .then(() => onPlaySuccess?.())
          .catch((err) => onPlayError?.(err));
      }
    }
  }, [stream, isVideoOff, onPlaySuccess, onPlayError]);

  useEffect(() => {
    syncStream();
  }, [syncStream]);

  return (
    <div
      onClick={onClick}
      className={`relative w-full h-full min-h-[260px] sm:min-h-[360px] bg-[#1a1a1a] border border-[#3d3a39] rounded-xl overflow-hidden flex items-center justify-center shadow-lg ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`.trim()}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          mirrored ? 'scale-x-[-1]' : ''
        } ${!isVideoOff && stream ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'}`}
      />

      {isVideoOff && fallback}
      {banner}
      {badge}
    </div>
  );
}
