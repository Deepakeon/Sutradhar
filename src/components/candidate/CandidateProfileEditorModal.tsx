'use client';

import React, { useState } from 'react';
import { CandidateProfile, SkillItem, ExperienceItem } from '@/types';
import { useApp } from '@/context/AppContext';

interface CandidateProfileEditorModalProps {
  onClose: () => void;
  initialSection?: 'context' | 'skill' | 'experience';
}

export function CandidateProfileEditorModal({
  onClose,
  initialSection = 'context'
}: CandidateProfileEditorModalProps) {
  const { currentUser, updateCandidateProfile } = useApp();
  const profile = currentUser.candidateProfile;

  const [activeSection, setActiveSection] = useState<'context' | 'skill' | 'experience'>(initialSection);

  // Context Form State
  const [headline, setHeadline] = useState(profile.headline);
  const [careerObjectives, setCareerObjectives] = useState(profile.context.careerObjectives);
  const [targetRolesText, setTargetRolesText] = useState(profile.targetRoles.join(', '));
  const [targetCompaniesText, setTargetCompaniesText] = useState(profile.context.targetCompanies.join(', '));
  const [preferredTimezone, setPreferredTimezone] = useState(profile.context.preferredTimezone);
  const [weeklyAvailabilityHours, setWeeklyAvailabilityHours] = useState(profile.context.weeklyAvailabilityHours);
  const [interviewFocusText, setInterviewFocusText] = useState(profile.context.interviewFocus.join(', '));

  // Add Skill Form State
  const [skillName, setSkillName] = useState('');
  const [skillCategory, setSkillCategory] = useState<string>('System Design');
  const [skillProficiency, setSkillProficiency] = useState<SkillItem['proficiency']>('Expert');
  const [skillYears, setSkillYears] = useState(5);

  // Add Experience Form State
  const [expTitle, setExpTitle] = useState('');
  const [expCompany, setExpCompany] = useState('');
  const [expPeriod, setExpPeriod] = useState('');
  const [expHighlights, setExpHighlights] = useState('');

  const handleSaveContext = (e: React.FormEvent) => {
    e.preventDefault();
    updateCandidateProfile({
      headline,
      targetRoles: targetRolesText.split(',').map((s) => s.trim()).filter(Boolean),
      context: {
        ...profile.context,
        careerObjectives,
        targetCompanies: targetCompaniesText.split(',').map((s) => s.trim()).filter(Boolean),
        preferredTimezone,
        weeklyAvailabilityHours: Number(weeklyAvailabilityHours),
        interviewFocus: interviewFocusText.split(',').map((s) => s.trim()).filter(Boolean)
      }
    });
    onClose();
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName.trim()) return;
    const newSkill: SkillItem = {
      id: `sk_c_${Date.now()}`,
      name: skillName.trim(),
      category: skillCategory,
      proficiency: skillProficiency,
      yearsOfExperience: Number(skillYears)
    };
    updateCandidateProfile({
      skills: [...profile.skills, newSkill]
    });
    onClose();
  };

  const handleAddExperience = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim() || !expCompany.trim()) return;
    const newExp: ExperienceItem = {
      id: `exp_c_${Date.now()}`,
      title: expTitle.trim(),
      company: expCompany.trim(),
      period: expPeriod.trim() || '2023 - Present',
      highlights: expHighlights.split('\n').map((h) => h.trim()).filter(Boolean)
    };
    updateCandidateProfile({
      experience: [newExp, ...profile.experience]
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-[8px] bg-[#101010] border border-[#3d3a39] p-6 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#3d3a39]">
          <div>
            <h3 className="text-lg font-bold text-[#f2f2f2]">
              Edit Candidate Profile
            </h3>
            <p className="text-xs text-[#8b949e]">
              Modifying candidate context, skills, or experience preserves interviewer configuration.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-[#f2f2f2] text-sm p-1 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-2 py-3 border-b border-[#3d3a39]">
          <button
            type="button"
            onClick={() => setActiveSection('context')}
            className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-colors ${activeSection === 'context'
                ? 'bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/40'
                : 'text-[#bdbdbd] hover:text-[#f2f2f2] hover:bg-[#1a1a1a]'
              }`}
          >
            Context & Objectives
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('skill')}
            className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-colors ${activeSection === 'skill'
                ? 'bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/40'
                : 'text-[#bdbdbd] hover:text-[#f2f2f2] hover:bg-[#1a1a1a]'
              }`}
          >
            + Add Technical Skill
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('experience')}
            className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-colors ${activeSection === 'experience'
                ? 'bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/40'
                : 'text-[#bdbdbd] hover:text-[#f2f2f2] hover:bg-[#1a1a1a]'
              }`}
          >
            + Add Experience
          </button>
        </div>

        {/* Form Body with scroll */}
        <div className="flex-1 overflow-y-auto py-4">
          {activeSection === 'context' && (
            <form onSubmit={handleSaveContext} id="candidate-context-form" className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                  Candidate Headline
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                  Target Roles (comma-separated)
                </label>
                <input
                  type="text"
                  value={targetRolesText}
                  onChange={(e) => setTargetRolesText(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                  Target Companies (comma-separated)
                </label>
                <input
                  type="text"
                  value={targetCompaniesText}
                  onChange={(e) => setTargetCompaniesText(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                  Career Objectives & Growth Goals
                </label>
                <textarea
                  value={careerObjectives}
                  onChange={(e) => setCareerObjectives(e.target.value)}
                  rows={3}
                  className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                    Timezone
                  </label>
                  <input
                    type="text"
                    value={preferredTimezone}
                    onChange={(e) => setPreferredTimezone(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                    Weekly Practice Hours
                  </label>
                  <input
                    type="number"
                    value={weeklyAvailabilityHours}
                    onChange={(e) => setWeeklyAvailabilityHours(Number(e.target.value))}
                    className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                    min={1}
                    max={40}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                  Interview Focus Areas (comma-separated)
                </label>
                <input
                  type="text"
                  value={interviewFocusText}
                  onChange={(e) => setInterviewFocusText(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                />
              </div>
            </form>
          )}

          {activeSection === 'skill' && (
            <form onSubmit={handleAddSkill} id="candidate-skill-form" className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                  Skill Name
                </label>
                <input
                  type="text"
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  placeholder="e.g., Raft Consensus State Machines"
                  className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                    Category
                  </label>
                  <select
                    value={skillCategory}
                    onChange={(e) => setSkillCategory(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                  >
                    <option value="System Design">System Design</option>
                    <option value="Architecture">Architecture</option>
                    <option value="Algorithms">Algorithms</option>
                    <option value="Storage">Storage</option>
                    <option value="Concurrency">Concurrency</option>
                    <option value="DevOps">DevOps</option>
                    <option value="Leadership">Leadership</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                    Proficiency Level
                  </label>
                  <select
                    value={skillProficiency}
                    onChange={(e) => setSkillProficiency(e.target.value as any)}
                    className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                  >
                    <option value="Expert">Expert</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Intermediate">Intermediate</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                  Years of Experience with this skill
                </label>
                <input
                  type="number"
                  value={skillYears}
                  onChange={(e) => setSkillYears(Number(e.target.value))}
                  min={1}
                  max={25}
                  className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                  required
                />
              </div>
            </form>
          )}

          {activeSection === 'experience' && (
            <form onSubmit={handleAddExperience} id="candidate-exp-form" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                    Job Title / Role
                  </label>
                  <input
                    type="text"
                    value={expTitle}
                    onChange={(e) => setExpTitle(e.target.value)}
                    placeholder="e.g., Staff Infrastructure Engineer"
                    className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    value={expCompany}
                    onChange={(e) => setExpCompany(e.target.value)}
                    placeholder="e.g., ScaleCloud"
                    className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                  Tenure / Period
                </label>
                <input
                  type="text"
                  value={expPeriod}
                  onChange={(e) => setExpPeriod(e.target.value)}
                  placeholder="e.g., 2022 - Present (2+ yrs)"
                  className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                  Key Achievements & Highlights (one per line)
                </label>
                <textarea
                  value={expHighlights}
                  onChange={(e) => setExpHighlights(e.target.value)}
                  rows={4}
                  placeholder="Built multi-region replication engine handling 10M ops/sec.&#10;Mentored 4 engineers through staff promotion cycles."
                  className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#3d3a39] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center font-semibold rounded-[6px] border border-[#3d3a39] bg-[#101010] text-[#f2f2f2] hover:border-[#8b949e] hover:bg-[#1a1a1a] transition-all px-4 py-2 text-xs cursor-pointer"
          >
            Cancel
          </button>
          {activeSection === 'context' && (
            <button
              type="submit"
              form="candidate-context-form"
              className="inline-flex items-center justify-center font-semibold rounded-[6px] bg-[#00d992] text-[#101010] hover:bg-[#2fd6a1] transition-all px-4 py-2 text-xs cursor-pointer"
            >
              Save Context
            </button>
          )}
          {activeSection === 'skill' && (
            <button
              type="submit"
              form="candidate-skill-form"
              className="inline-flex items-center justify-center font-semibold rounded-[6px] bg-[#00d992] text-[#101010] hover:bg-[#2fd6a1] transition-all px-4 py-2 text-xs cursor-pointer"
            >
              Add Skill
            </button>
          )}
          {activeSection === 'experience' && (
            <button
              type="submit"
              form="candidate-exp-form"
              className="inline-flex items-center justify-center font-semibold rounded-[6px] bg-[#00d992] text-[#101010] hover:bg-[#2fd6a1] transition-all px-4 py-2 text-xs cursor-pointer"
            >
              Add Experience
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
