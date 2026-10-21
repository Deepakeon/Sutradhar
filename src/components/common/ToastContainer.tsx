'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';

export function ToastContainer() {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isInfo = toast.type === 'info';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-[8px] bg-[#101010] border border-[#3d3a39] shadow-2xl transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isSuccess
                    ? 'bg-[#00d992]'
                    : isInfo
                      ? 'bg-[#2fd6a1]'
                      : 'bg-amber-400'
                  }`}
              />
              <p className="text-sm text-[#f2f2f2] leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#8b949e] hover:text-[#f2f2f2] text-xs transition-colors p-1"
              aria-label="Close notification"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
