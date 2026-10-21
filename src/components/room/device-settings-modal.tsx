'use client';

import React from 'react';

interface DeviceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: MediaDeviceInfo[];
  onDeviceChange: (kind: 'audioinput' | 'videoinput', deviceId: string) => void;
}

export function DeviceSettingsModal({
  isOpen,
  onClose,
  devices,
  onDeviceChange,
}: DeviceSettingsModalProps) {
  if (!isOpen) return null;

  const audioInputs = devices.filter((d) => d.kind === 'audioinput');
  const videoInputs = devices.filter((d) => d.kind === 'videoinput');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#101010] border border-[#3d3a39] rounded-xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-[#3d3a39]">
          <h2 className="text-base font-semibold text-[#f2f2f2]">Device Settings</h2>
          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-[#f2f2f2] text-sm p-1 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 py-4">
          {/* Microphone Selector */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#8b949e] mb-2">
              Microphone
            </label>
            <select
              className="w-full bg-[#1a1a1a] border border-[#3d3a39] text-[#f2f2f2] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#00d992]"
              onChange={(e) => onDeviceChange('audioinput', e.target.value)}
            >
              {audioInputs.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Microphone ${i + 1}`}
                </option>
              ))}
            </select>
          </div>

          {/* Camera Selector */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#8b949e] mb-2">
              Camera
            </label>
            <select
              className="w-full bg-[#1a1a1a] border border-[#3d3a39] text-[#f2f2f2] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#00d992]"
              onChange={(e) => onDeviceChange('videoinput', e.target.value)}
            >
              {videoInputs.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-[#3d3a39] flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#00d992] hover:bg-[#2fd6a1] text-[#101010] font-semibold text-sm px-4 py-2 rounded-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
