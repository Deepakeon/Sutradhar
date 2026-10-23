'use client';

import React, { useState } from 'react';
import { InterviewerSkillItem, SkillProficiency } from '@/types';
import { useApp } from '@/context/AppContext';

interface UserProfileEditorModalProps {
  onClose: () => void;
  initialSection?: 'context' | 'skill' | 'credentials';
}

export function UserProfileEditorModal({
  onClose,
  initialSection = 'context'
}: UserProfileEditorModalProps) {
  const { currentUser, updateInterviewerProfile, showToast } = useApp();
  const profile = currentUser.interviewerProfile;

  const [activeSection, setActiveSection] = useState<'context' | 'skill' | 'credentials'>(initialSection);

  // Context & Target Form State
  const [headline, setHeadline] = useState(profile.headline || '');
  const [objectives, setObjectives] = useState(
    profile.objectives ||
      profile.context?.interviewPhilosophy ||
      ''
  );
  const [targetRolesText, setTargetRolesText] = useState(
    (profile.targetRoles && profile.targetRoles.length > 0)
      ? profile.targetRoles.join('\n')
      : 'Staff Distributed Systems Engineer\nPrincipal Infrastructure Architect\nLead Storage Engine Developer'
  );
  const [timezone, setTimezone] = useState(
    profile.timezone || profile.context?.preferredTimezone || 'America/New_York (UTC-5)'
  );
  const [weeklyAvailability, setWeeklyAvailability] = useState(
    profile.weeklyAvailability || profile.context?.availabilitySchedule || '8 hours / week'
  );

  // Skill Form State
  const [skillName, setSkillName] = useState('');
  const [skillProficiency, setSkillProficiency] = useState<SkillProficiency>('Expert');

  // Credentials & Experience State
  const [primaryCompany, setPrimaryCompany] = useState(profile.experience.primaryCompany);
  const [yearsInterviewing, setYearsInterviewing] = useState(profile.experience.yearsInterviewing);
  const [certificationsText, setCertificationsText] = useState(profile.experience.certifications.join(', '));
  const [totalInterviewsConducted, setTotalInterviewsConducted] = useState(profile.experience.totalInterviewsConducted);

  const handleSaveContext = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedRoles = targetRolesText
      .split(/[\n,;]/)
      .map((r) => r.trim())
      .filter(Boolean);

    updateInterviewerProfile({
      headline,
      objectives,
      targetRoles: parsedRoles,
      timezone,
      weeklyAvailability,
      context: {
        ...profile.context,
        interviewPhilosophy: objectives,
        availabilitySchedule: weeklyAvailability,
        preferredTimezone: timezone
      }
    });
    showToast('Context & Target updated successfully', 'success');
    onClose();
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName.trim()) return;
    const newSkill: InterviewerSkillItem = {
      id: `sk_i_${Date.now()}`,
      name: skillName.trim(),
      proficiency: skillProficiency,
      level: skillProficiency === 'Expert' ? 'Staff Bar Raiser' : skillProficiency === 'Intermediate' ? 'Senior Assessor' : 'Domain Specialist',
      interviewsConducted: 20
    };
    updateInterviewerProfile({
      skills: [...profile.skills, newSkill]
    });
    setSkillName('');
    showToast('Skill added to profile', 'success');
  };

  const handleRemoveSkill = (skillId: string) => {
    updateInterviewerProfile({
      skills: profile.skills.filter((s) => s.id !== skillId)
    });
    showToast('Skill removed', 'info');
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    updateInterviewerProfile({
      experience: {
        ...profile.experience,
        primaryCompany,
        yearsInterviewing: Number(yearsInterviewing),
        totalInterviewsConducted: Number(totalInterviewsConducted),
        certifications: certificationsText.split(',').map((c) => c.trim()).filter(Boolean)
      }
    });
    showToast('Credentials updated successfully', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-[8px] bg-[#101010] border border-[#3d3a39] p-6 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#3d3a39]">
          <div>
            <h3 className="text-lg font-bold text-[#f2f2f2]">
              Edit User Profile
            </h3>
            <p className="text-xs text-[#8b949e]">
              Manage your context, target roles, technical proficiency, and verified calibration credentials.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-[#f2f2f2] text-sm p-1 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Section Tabs / Selection Bar */}
        <div className="flex gap-2 py-3 border-b border-[#3d3a39] overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveSection('context')}
            className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeSection === 'context'
                ? 'bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/40 font-bold'
                : 'text-[#bdbdbd] hover:text-[#f2f2f2] hover:bg-[#1a1a1a]'
            }`}
          >
            Context & Target
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('skill')}
            className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeSection === 'skill'
                ? 'bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/40 font-bold'
                : 'text-[#bdbdbd] hover:text-[#f2f2f2] hover:bg-[#1a1a1a]'
            }`}
          >
            Skills & Proficiency ({profile.skills.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('credentials')}
            className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeSection === 'credentials'
                ? 'bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/40 font-bold'
                : 'text-[#bdbdbd] hover:text-[#f2f2f2] hover:bg-[#1a1a1a]'
            }`}
          >
            Credentials & Track Record
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto py-4">
          {/* Section 1: Context and Target */}
          {activeSection === 'context' && (
            <form onSubmit={handleSaveContext} id="profile-context-form" className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                  Headline
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
                  Objectives
                </label>
                <textarea
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  rows={4}
                  className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                  Target Roles (one per line or comma-separated)
                </label>
                <textarea
                  value={targetRolesText}
                  onChange={(e) => setTargetRolesText(e.target.value)}
                  rows={3}
                  className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992] font-mono text-xs"
                  placeholder="Staff Distributed Systems Engineer&#10;Principal Infrastructure Architect&#10;Lead Storage Engine Developer"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                    Timezone
                  </label>
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                    Weekly Availability (per day & time range)
                  </label>
                  <input
                    type="text"
                    value={weeklyAvailability}
                    onChange={(e) => setWeeklyAvailability(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                    placeholder="e.g. 8 hours / week"
                    required
                  />
                </div>
              </div>
            </form>
          )}

          {/* Section 2: Skills and Proficiency */}
          {activeSection === 'skill' && (
            <div className="space-y-6">
              {/* Existing Skills List */}
              <div className="space-y-3">
                <span className="text-xs font-mono uppercase text-[#8b949e]">
                  Configured Skills ({profile.skills.length})
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {profile.skills.map((skill) => (
                    <div
                      key={skill.id}
                      className="p-3 rounded-[6px] bg-[#1a1a1a] border border-[#3d3a39] flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-semibold text-[#f2f2f2]">
                          {skill.name}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-[#8b949e] mt-0.5">
                          <span
                            className={
                              skill.proficiency === 'Expert'
                                ? 'text-[#00d992] font-bold'
                                : skill.proficiency === 'Intermediate'
                                ? 'text-sky-400 font-bold'
                                : 'text-amber-400 font-bold'
                            }
                          >
                            {skill.proficiency || 'Expert'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill.id)}
                        className="text-xs text-[#8b949e] hover:text-red-400 p-1 cursor-pointer transition-colors"
                        title="Remove skill"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form to Add New Skill */}
              <form onSubmit={handleAddSkill} id="profile-skill-form" className="space-y-4 pt-3 border-t border-[#3d3a39]">
                <span className="text-xs font-mono uppercase text-[#00d992] flex items-center gap-1.5">
                  <span>+</span> Add New Skill
                </span>

                <div>
                  <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                    Skill Name
                  </label>
                  <input
                    type="text"
                    value={skillName}
                    onChange={(e) => setSkillName(e.target.value)}
                    placeholder="e.g. Distributed Consensus (Raft / Paxos)"
                    className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                    Proficiency Level
                  </label>
                  <select
                    value={skillProficiency}
                    onChange={(e) => setSkillProficiency(e.target.value as SkillProficiency)}
                    className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center font-semibold rounded-[6px] bg-[#00d992] text-[#101010] hover:bg-[#2fd6a1] transition-all px-4 py-2 text-xs cursor-pointer"
                >
                  Add Skill to Profile
                </button>
              </form>
            </div>
          )}

          {/* Section 3: Credentials & Experience */}
          {activeSection === 'credentials' && (
            <form onSubmit={handleSaveCredentials} id="profile-credentials-form" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                    Primary Company / Org
                  </label>
                  <input
                    type="text"
                    value={primaryCompany}
                    onChange={(e) => setPrimaryCompany(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                    Years Active in Practice
                  </label>
                  <input
                    type="number"
                    value={yearsInterviewing}
                    onChange={(e) => setYearsInterviewing(Number(e.target.value))}
                    min={1}
                    max={30}
                    className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                  Lifetime Mock Sessions Conducted
                </label>
                <input
                  type="number"
                  value={totalInterviewsConducted}
                  onChange={(e) => setTotalInterviewsConducted(Number(e.target.value))}
                  min={1}
                  max={2000}
                  className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                  Certifications & Committees (comma-separated)
                </label>
                <textarea
                  value={certificationsText}
                  onChange={(e) => setCertificationsText(e.target.value)}
                  rows={3}
                  className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                  placeholder="e.g. Certified Principal Calibration Lead, Distributed Architecture Committee Member"
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
            Close
          </button>
          {activeSection === 'context' && (
            <button
              type="submit"
              form="profile-context-form"
              className="inline-flex items-center justify-center font-semibold rounded-[6px] bg-[#00d992] text-[#101010] hover:bg-[#2fd6a1] transition-all px-4 py-2 text-xs cursor-pointer"
            >
              Save Context & Target
            </button>
          )}
          {activeSection === 'credentials' && (
            <button
              type="submit"
              form="profile-credentials-form"
              className="inline-flex items-center justify-center font-semibold rounded-[6px] bg-[#00d992] text-[#101010] hover:bg-[#2fd6a1] transition-all px-4 py-2 text-xs cursor-pointer"
            >
              Save Credentials
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
