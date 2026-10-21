'use client';

import React, { useState } from 'react';
import { MatchingInterviewer } from '@/types';
import { useApp } from '@/context/AppContext';

interface RequestInterviewModalProps {
  interviewer: MatchingInterviewer | null;
  onClose: () => void;
}

export function RequestInterviewModal({ interviewer, onClose }: RequestInterviewModalProps) {
  const { requestInterview } = useApp();
  const [selectedFormat, setSelectedFormat] = useState(
    interviewer?.formats[0] || '60m Staff System Design Deep-Dive'
  );
  const [scheduledDate, setScheduledDate] = useState('Tomorrow, 6:00 PM EST');
  const [notes, setNotes] = useState('');

  if (!interviewer) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requestInterview(
      interviewer.id,
      interviewer.name,
      interviewer.avatar,
      interviewer.company,
      selectedFormat,
      scheduledDate,
      notes || 'Looking forward to diving into high-scale design trade-offs and receiving staff calibration feedback.'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-[8px] bg-[#101010] border border-[#3d3a39] p-6 shadow-2xl">
        <div className="flex items-start justify-between pb-4 border-b border-[#3d3a39]">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={interviewer.avatar}
              alt={interviewer.name}
              className="w-12 h-12 rounded-full border border-[#3d3a39] object-cover"
            />
            <div>
              <h3 className="text-lg font-bold text-[#f2f2f2]">
                Request Mock Interview with {interviewer.name}
              </h3>
              <p className="text-xs text-[#bdbdbd]">
                {interviewer.currentTitle} • {interviewer.company}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-[#f2f2f2] text-sm p-1 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Compatibility highlight */}
        <div className="my-4 p-3 rounded-[6px] bg-[#1a1a1a] border border-[#00d992]/30 flex items-center gap-3">
          <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#00d992]/20 text-[#00d992] border border-[#00d992]/40">
            {interviewer.compatibilityScore}% MATCH
          </span>
          <p className="text-xs text-[#bdbdbd]">
            {interviewer.compatibilityReason}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#bdbdbd] mb-1.5 uppercase font-mono tracking-wider">
              Session Format
            </label>
            <div className="space-y-2">
              {interviewer.formats.map((fmt) => (
                <label
                  key={fmt}
                  className={`flex items-center justify-between p-3 rounded-[6px] border cursor-pointer transition-all ${selectedFormat === fmt
                      ? 'bg-[#1a1a1a] border-[#00d992] text-[#f2f2f2]'
                      : 'bg-[#101010] border-[#3d3a39] text-[#bdbdbd] hover:border-[#8b949e]'
                    }`}
                >
                  <span className="text-sm font-medium">{fmt}</span>
                  <input
                    type="radio"
                    name="format"
                    value={fmt}
                    checked={selectedFormat === fmt}
                    onChange={() => setSelectedFormat(fmt)}
                    className="accent-[#00d992]"
                  />
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#bdbdbd] mb-1.5 uppercase font-mono tracking-wider">
              Proposed Schedule / Slot
            </label>
            <input
              type="text"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3.5 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
              placeholder="e.g., Tomorrow, 6:00 PM EST"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#bdbdbd] mb-1.5 uppercase font-mono tracking-wider">
              Specific Prep Goals / System Design Topic
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3.5 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992] placeholder-[#8b949e]"
              placeholder="e.g., I'd like to simulate an active-active cross-region consensus state machine with network partitioning failure modes."
            />
          </div>

          <div className="pt-3 border-t border-[#3d3a39] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center font-semibold rounded-[6px] border border-[#3d3a39] bg-[#101010] text-[#f2f2f2] hover:border-[#8b949e] hover:bg-[#1a1a1a] transition-all px-4 py-2 text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center font-semibold rounded-[6px] bg-[#00d992] text-[#101010] hover:bg-[#2fd6a1] transition-all px-4 py-2 text-xs cursor-pointer"
            >
              Send Interview Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
