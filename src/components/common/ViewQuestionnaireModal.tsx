'use client';

import React from 'react';
import { InterviewSession } from '@/types';

interface ViewQuestionnaireModalProps {
  session: InterviewSession;
  onClose: () => void;
}

export function ViewQuestionnaireModal({ session, onClose }: ViewQuestionnaireModalProps) {
  const q = session.questionnaire;
  if (!q) return null;

  const renderRatingBar = (label: string, score: number) => {
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-[#bdbdbd]">{label}</span>
          <span className="font-mono text-[#00d992] font-semibold">{score} / 5.0</span>
        </div>
        <div className="h-1.5 w-full bg-[#1a1a1a] rounded-full overflow-hidden border border-[#3d3a39]">
          <div
            className="h-full bg-[#00d992] rounded-full transition-all duration-300"
            style={{ width: `${(score / 5) * 100}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-[8px] bg-[#101010] border border-[#3d3a39] p-6 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#3d3a39]">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/40">
                SCORECARD
              </span>
              <span className="text-xs text-[#8b949e] font-mono">
                {session.format}
              </span>
            </div>
            <h3 className="text-lg font-bold text-[#f2f2f2] mt-1">
              Interview Evaluation & Rubric
            </h3>
            <p className="text-xs text-[#8b949e]">
              Interviewer: {session.interviewerName} ({session.interviewerCompany}) • Candidate: {session.candidateName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-[#f2f2f2] text-sm p-1 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Recommendation Banner */}
          <div className="p-4 rounded-[6px] bg-[#1a1a1a] border border-[#3d3a39] flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#8b949e]">
                Hiring Committee Recommendation
              </span>
              <div className="text-xl font-bold text-[#00d992] mt-0.5">
                {q.overallRecommendation}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#8b949e]">
                Evaluation Date
              </span>
              <div className="text-xs font-mono text-[#bdbdbd] mt-0.5">
                {new Date(q.submittedAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Rubric Grid */}
          <div className="p-4 rounded-[6px] bg-[#1a1a1a] border border-[#3d3a39] space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#8b949e]">
              Evaluation Dimensions
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderRatingBar('System Architecture', q.systemArchitectureRating)}
              {renderRatingBar('Technical Depth & Trade-offs', q.technicalDepthRating)}
              {renderRatingBar('Problem Solving & Edge Cases', q.problemSolvingRating)}
              {renderRatingBar('Communication & Calibration', q.communicationRating)}
            </div>
          </div>

          {/* Feedback Sections */}
          <div className="space-y-4">
            <div className="p-4 rounded-[6px] bg-[#1a1a1a] border border-[#3d3a39]">
              <h4 className="text-xs font-mono uppercase tracking-wider text-[#00d992] mb-1.5 flex items-center gap-1.5">
                <span>✦</span> Strengths Observed
              </h4>
              <p className="text-sm text-[#f2f2f2] leading-relaxed">
                {q.strengths}
              </p>
            </div>

            <div className="p-4 rounded-[6px] bg-[#1a1a1a] border border-[#3d3a39]">
              <h4 className="text-xs font-mono uppercase tracking-wider text-amber-400 mb-1.5 flex items-center gap-1.5">
                <span>▲</span> Growth & Focus Areas
              </h4>
              <p className="text-sm text-[#f2f2f2] leading-relaxed">
                {q.areasForGrowth}
              </p>
            </div>

            <div className="p-4 rounded-[6px] bg-[#1a1a1a] border border-[#3d3a39]">
              <h4 className="text-xs font-mono uppercase tracking-wider text-[#8b949e] mb-1.5">
                Detailed Calibration Summary
              </h4>
              <p className="text-sm text-[#bdbdbd] leading-relaxed">
                {q.detailedFeedback}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#3d3a39] flex justify-end">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center font-semibold rounded-[6px] border border-[#3d3a39] bg-[#101010] text-[#f2f2f2] hover:border-[#8b949e] hover:bg-[#1a1a1a] transition-all px-4 py-2 text-xs cursor-pointer"
          >
            Close Scorecard
          </button>
        </div>
      </div>
    </div>
  );
}
