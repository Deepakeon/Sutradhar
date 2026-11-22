import React from 'react';
import { FiAlertCircle } from 'react-icons/fi';
import { Action } from '@/types';

export interface RoomErrorProps {
  title?: string;
  message?: string;
  action?: Action;
  className?: string;
}

export function RoomError({
  title = 'Access Restricted',
  message = 'Unable to join call room',
  action,
  className = '',
}: RoomErrorProps) {
  return (
    <div className={`min-h-screen bg-[#101010] flex items-center justify-center p-4 ${className}`.trim()}>
      <div className="max-w-md w-full bg-[#1a1a1a] border border-[#ff4d4f]/40 rounded-xl p-6 shadow-xl text-center">
        <div className="w-12 h-12 rounded-full bg-[#ff4d4f]/20 text-[#ff4d4f] flex items-center justify-center mx-auto mb-4">
          <FiAlertCircle className="text-2xl" />
        </div>
        <h2 className="text-lg font-semibold text-[#f2f2f2] mb-2">{title}</h2>
        <p className="text-sm text-[#8b949e] mb-6">{message}</p>
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
