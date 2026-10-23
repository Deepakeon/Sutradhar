'use client';

import React, { useState } from 'react';
import { MatchingCandidate } from '@/types';
import { useApp } from '@/context/AppContext';

interface InviteCandidateModalProps {
  candidate: MatchingCandidate | null;
  onClose: () => void;
}

export function InviteCandidateModal({ candidate, onClose }: InviteCandidateModalProps) {
  const { requestInterview } = useApp();
  const [selectedFormat, setSelectedFormat] = useState(candidate?.preferredFormat || '60m Staff System Design Deep-Dive');
  const [scheduledDate, setScheduledDate] = useState('This Friday, 6:00 PM EST');
  const [notes, setNotes] = useState('');

  if (!candidate) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requestInterview(
      candidate.id,
      candidate.name,
      candidate.avatar,
      candidate.targetRole,
      selectedFormat,
      scheduledDate,
      notes || `Hi ${candidate.name}, I reviewed your target focus and would love to conduct a calibration mock interview on ${selectedFormat}.`
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
              src={candidate.avatar}
              alt={candidate.name}
              className="w-12 h-12 rounded-full border border-[#3d3a39] object-cover"
            />
            <div>
              <h3 className="text-lg font-bold text-[#f2f2f2]">
                Invite {candidate.name} to Mock Interview
              </h3>
              <p className="text-xs text-[#bdbdbd]">
                {candidate.targetRole} • Currently {candidate.currentCompany}
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

        {/* Compatibility badge */}
        <div className="my-4 p-3 rounded-[6px] bg-[#1a1a1a] border border-[#00d992]/30 flex items-center gap-3">
          <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#00d992]/20 text-[#00d992] border border-[#00d992]/40">
            {candidate.compatibilityScore}% MATCH
          </span>
          <p className="text-xs text-[#bdbdbd]">
            {candidate.compatibilityReason}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#bdbdbd] mb-1.5 uppercase font-mono tracking-wider">
              Interview Format / Rubric
            </label>
            <input
              type="text"
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3.5 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
              required
            />
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
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#bdbdbd] mb-1.5 uppercase font-mono tracking-wider">
              Personal Note / Invitation Message
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g., Happy to run an end-to-end distributed system design simulation with detailed feedback afterwards."
              className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3.5 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
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
              Send Session Invitation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
