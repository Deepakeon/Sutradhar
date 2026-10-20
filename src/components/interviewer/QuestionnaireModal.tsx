'use client';

import React, { useState } from 'react';
import { InterviewSession, InterviewQuestionnaire } from '@/types';
import { useApp } from '@/context/AppContext';

interface QuestionnaireModalProps {
  session: InterviewSession;
  onClose: () => void;
}

export function QuestionnaireModal({ session, onClose }: QuestionnaireModalProps) {
  const { submitQuestionnaire } = useApp();

  const [systemArch, setSystemArch] = useState(session.questionnaire?.systemArchitectureRating || 4);
  const [techDepth, setTechDepth] = useState(session.questionnaire?.technicalDepthRating || 4);
  const [problemSolving, setProblemSolving] = useState(session.questionnaire?.problemSolvingRating || 4);
  const [communication, setCommunication] = useState(session.questionnaire?.communicationRating || 4);
  const [recommendation, setRecommendation] = useState<InterviewQuestionnaire['overallRecommendation']>(
    session.questionnaire?.overallRecommendation || 'Hire'
  );
  const [strengths, setStrengths] = useState(session.questionnaire?.strengths || '');
  const [areasForGrowth, setAreasForGrowth] = useState(session.questionnaire?.areasForGrowth || '');
  const [detailedFeedback, setDetailedFeedback] = useState(session.questionnaire?.detailedFeedback || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitQuestionnaire(session.id, {
      systemArchitectureRating: systemArch,
      technicalDepthRating: techDepth,
      problemSolvingRating: problemSolving,
      communicationRating: communication,
      overallRecommendation: recommendation,
      strengths: strengths || 'Demonstrated solid mental models and clear failure mode articulation.',
      areasForGrowth: areasForGrowth || 'Could structure upfront capacity estimation more systematically.',
      detailedFeedback: detailedFeedback || 'Strong candidate who would calibrate well at staff levels.',
      submittedAt: new Date().toISOString()
    });
    onClose();
  };

  const renderRatingInput = (
    label: string,
    value: number,
    onChange: (val: number) => void
  ) => {
    return (
      <div className="p-3 rounded-[6px] bg-[#101010] border border-[#3d3a39] space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-mono uppercase text-[#bdbdbd]">{label}</span>
          <span className="text-xs font-mono font-bold text-[#00d992]">{value} / 5</span>
        </div>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              className={`flex-1 py-1 text-xs font-mono font-semibold rounded-[4px] border transition-all cursor-pointer ${value >= star
                  ? 'bg-[#00d992]/20 border-[#00d992] text-[#00d992]'
                  : 'bg-[#1a1a1a] border-[#3d3a39] text-[#8b949e] hover:border-[#8b949e]'
                }`}
            >
              {star}★
            </button>
          ))}
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
                POST-INTERVIEW QUESTIONNAIRE
              </span>
              <span className="text-xs text-[#8b949e] font-mono">
                {session.format}
              </span>
            </div>
            <h3 className="text-lg font-bold text-[#f2f2f2] mt-1">
              Candidate Scorecard: {session.candidateName}
            </h3>
            <p className="text-xs text-[#8b949e]">
              Role target: {session.candidateRole}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-[#f2f2f2] text-sm p-1 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} id="questionnaire-form" className="flex-1 overflow-y-auto py-4 space-y-5">
          {/* Recommendation Selector */}
          <div>
            <label className="block text-xs font-mono uppercase text-[#bdbdbd] mb-2">
              Overall Hiring Recommendation
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(['Strong Hire', 'Hire', 'Lean Hire', 'Lean No Hire', 'No Hire'] as const).map((rec) => (
                <button
                  key={rec}
                  type="button"
                  onClick={() => setRecommendation(rec)}
                  className={`py-2 px-1 text-center rounded-[6px] text-xs font-medium border transition-all cursor-pointer ${recommendation === rec
                      ? rec.includes('Hire') && !rec.includes('No')
                        ? 'bg-[#00d992]/20 border-[#00d992] text-[#00d992] font-bold'
                        : 'bg-red-500/20 border-red-500 text-red-400 font-bold'
                      : 'bg-[#1a1a1a] border-[#3d3a39] text-[#8b949e] hover:text-[#f2f2f2]'
                    }`}
                >
                  {rec}
                </button>
              ))}
            </div>
          </div>

          {/* Rating Dimensions */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#8b949e]">
              Core Evaluation Dimensions
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {renderRatingInput('System Architecture & Scaling', systemArch, setSystemArch)}
              {renderRatingInput('Technical Depth & Trade-offs', techDepth, setTechDepth)}
              {renderRatingInput('Problem Solving & Edge Cases', problemSolving, setProblemSolving)}
              {renderRatingInput('Communication & Calibration', communication, setCommunication)}
            </div>
          </div>

          {/* Text Feedback */}
          <div>
            <label className="block text-xs font-mono uppercase text-[#00d992] mb-1.5 flex items-center gap-1.5">
              <span>✦</span> Key Strengths Observed
            </label>
            <textarea
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              rows={2}
              placeholder="e.g., Quick to recognize distributed cache stampede risks; proposed exponential backoff with jitter."
              className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] p-3 text-xs text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-amber-400 mb-1.5 flex items-center gap-1.5">
              <span>▲</span> Areas for Growth & Next Steps
            </label>
            <textarea
              value={areasForGrowth}
              onChange={(e) => setAreasForGrowth(e.target.value)}
              rows={2}
              placeholder="e.g., Needs to explain trade-offs between eventual vs causal consistency more crisply before writing schema."
              className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] p-3 text-xs text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-[#8b949e] mb-1.5">
              Detailed Committee Calibration Summary
            </label>
            <textarea
              value={detailedFeedback}
              onChange={(e) => setDetailedFeedback(e.target.value)}
              rows={3}
              placeholder="Comprehensive summary of how candidate compares against Staff bar benchmarks..."
              className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] p-3 text-xs text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
              required
            />
          </div>
        </form>

        {/* Footer */}
        <div className="pt-4 border-t border-[#3d3a39] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center font-semibold rounded-[6px] border border-[#3d3a39] bg-[#101010] text-[#f2f2f2] hover:border-[#8b949e] hover:bg-[#1a1a1a] transition-all px-4 py-2 text-xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="questionnaire-form"
            className="inline-flex items-center justify-center font-semibold rounded-[6px] bg-[#00d992] text-[#101010] hover:bg-[#2fd6a1] transition-all px-4 py-2 text-xs cursor-pointer"
          >
            Submit Scorecard
          </button>
        </div>
      </div>
    </div>
  );
}
