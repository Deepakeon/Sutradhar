'use client';

import { IconType } from 'react-icons';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff } from 'react-icons/fi';
import { Action } from '@/types/types';

export type { Action };

export interface MediaControlsProps {
  actions: Action[];
  className?: string;
}

const ACTION_ICONS: Record<string, IconType> = {
  'mic:enabled': FiMic,
  'mic:disabled': FiMicOff,
  'camera:enabled': FiVideo,
  'camera:disabled': FiVideoOff,
  'end-call:enabled': FiPhoneOff,
  'end-call:disabled': FiPhoneOff,
};

const ACTION_TITLES: Record<string, string> = {
  'mic:enabled': 'Mute Microphone',
  'mic:disabled': 'Unmute Microphone',
  'camera:enabled': 'Turn Camera Off',
  'camera:disabled': 'Turn Camera On',
  'end-call:enabled': 'Leave Interview Call',
  'end-call:disabled': 'Leave Interview Call',
};

const ACTION_LABELS: Record<string, string> = {
  'mic:enabled': 'Mute',
  'mic:disabled': 'Unmute',
  'camera:enabled': 'Camera Off',
  'camera:disabled': 'Camera On',
  'end-call:enabled': 'End Call',
  'end-call:disabled': 'End Call',
};

export function MediaControls({ actions, className = '' }: MediaControlsProps) {
  return (
    <footer
      className={`w-full bg-[#101010] border-t border-[#3d3a39] py-3 px-4 flex items-center justify-center gap-3 sm:gap-4 select-none ${className}`.trim()}
    >
      {actions.map((action, index) => {
        const stateKey = `${action.id}:${action.enabled ? 'enabled' : 'disabled'}`;
        const Icon = action.icon ? null : ACTION_ICONS[stateKey];
        const title = action.title || ACTION_TITLES[stateKey];
        const label = action.label || ACTION_LABELS[stateKey];

        return (
          <button
            key={action.id || `action-${index}`}
            onClick={() => action.onAction?.()}
            disabled={action.disabled}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              !action.enabled
                ? 'bg-[#ff4d4f]/20 text-[#ff4d4f] border border-[#ff4d4f]/40 hover:bg-[#ff4d4f]/30'
                : 'bg-[#1a1a1a] text-[#f2f2f2] border border-[#3d3a39] hover:border-[#8b949e]'
            } ${action.className || ''}`.trim()}
            title={title}
          >
            {Icon && (
              <span className="text-base flex items-center">
                <Icon />
              </span>
            )}
            {action.icon && <span className="text-base flex items-center">{action.icon}</span>}
            {label && <span className="hidden sm:inline">{label}</span>}
          </button>
        );
      })}
    </footer>
  );
}
