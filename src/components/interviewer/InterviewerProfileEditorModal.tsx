'use client';

import React, { useState } from 'react';
import { InterviewerProfile, InterviewerSkillItem } from '@/types';
import { useApp } from '@/context/AppContext';

interface InterviewerProfileEditorModalProps {
  onClose: () => void;
  initialSection?: 'context' | 'skill' | 'credentials';
}

export function InterviewerProfileEditorModal({
  onClose,
  initialSection = 'context'
}: InterviewerProfileEditorModalProps) {
  const { currentUser, updateInterviewerProfile, showToast } = useApp();
  const profile = currentUser.interviewerProfile;

  const [activeSection, setActiveSection] = useState<'context' | 'skill' | 'credentials'>(initialSection);

  // Context Form State
  const [headline, setHeadline] = useState(profile.headline);
  const [interviewPhilosophy, setInterviewPhilosophy] = useState(profile.context.interviewPhilosophy);
  const [sessionFormatsText, setSessionFormatsText] = useState(profile.context.sessionFormats.join('; '));
  const [availabilitySchedule, setAvailabilitySchedule] = useState(profile.context.availabilitySchedule);
  const [preferredTimezone, setPreferredTimezone] = useState(profile.context.preferredTimezone);
  const [maxSessionsPerWeek, setMaxSessionsPerWeek] = useState(profile.context.maxSessionsPerWeek);
  const [domainsText, setDomainsText] = useState(profile.domains.join(', '));
  const [honorarium, setHonorarium] = useState(profile.context.hourlyHonorarium || 'Free Barter / Community Credits');

  // Skill Form State
  const [skillName, setSkillName] = useState('');
  const [skillCategory, setSkillCategory] = useState<string>('System Design');
  const [skillLevel, setSkillLevel] = useState<InterviewerSkillItem['level']>('Staff Bar Raiser');
  const [interviewsConducted, setInterviewsConducted] = useState(25);

  // Credentials & Experience State
  const [primaryCompany, setPrimaryCompany] = useState(profile.experience.primaryCompany);
  const [yearsInterviewing, setYearsInterviewing] = useState(profile.experience.yearsInterviewing);
  const [certificationsText, setCertificationsText] = useState(profile.experience.certifications.join(', '));
  const [totalInterviewsConducted, setTotalInterviewsConducted] = useState(profile.experience.totalInterviewsConducted);

  const handleSaveContext = (e: React.FormEvent) => {
    e.preventDefault();
    updateInterviewerProfile({
      headline,
      domains: domainsText.split(',').map((d) => d.trim()).filter(Boolean),
      context: {
        ...profile.context,
        interviewPhilosophy,
        sessionFormats: sessionFormatsText.split(';').map((s) => s.trim()).filter(Boolean),
        availabilitySchedule,
        preferredTimezone,
        maxSessionsPerWeek: Number(maxSessionsPerWeek),
        hourlyHonorarium: honorarium
      }
    });
    onClose();
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName.trim()) return;
    const newSkill: InterviewerSkillItem = {
      id: `sk_i_${Date.now()}`,
      name: skillName.trim(),
      category: skillCategory,
      level: skillLevel,
      interviewsConducted: Number(interviewsConducted)
    };
    updateInterviewerProfile({
      skills: [...profile.skills, newSkill]
    });
    setSkillName('');
    showToast('Assessment capability added to portfolio', 'success');
  };

  const handleRemoveSkill = (skillId: string) => {
    updateInterviewerProfile({
      skills: profile.skills.filter((s) => s.id !== skillId)
    });
    showToast('Assessment capability removed', 'info');
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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-[8px] bg-[#101010] border border-[#3d3a39] p-6 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#3d3a39]">
          <div>
            <h3 className="text-lg font-bold text-[#f2f2f2]">
              Edit Interviewer Portfolio
            </h3>
            <p className="text-xs text-[#8b949e]">
              Manage all dimensions of your interviewer portfolio: philosophy, rubrics, skills, and credentials.
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
            Philosophy & Formats
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
            Assessment Capabilities ({profile.skills.length})
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
            Credentials & Experience
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto py-4">
          {/* Section 1: Philosophy & Formats */}
          {activeSection === 'context' && (
            <form onSubmit={handleSaveContext} id="interviewer-context-form" className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                  Interviewer Headline & Title
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
                  Interview Philosophy & Evaluation Approach
                </label>
                <textarea
                  value={interviewPhilosophy}
                  onChange={(e) => setInterviewPhilosophy(e.target.value)}
                  rows={3}
                  className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                  Session Formats Offered (semicolon-separated)
                </label>
                <input
                  type="text"
                  value={sessionFormatsText}
                  onChange={(e) => setSessionFormatsText(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                  placeholder="e.g. 60m Staff System Design Deep-Dive; 45m Concurrency & Lock-Free Code"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                  Domains Assessed (comma-separated)
                </label>
                <input
                  type="text"
                  value={domainsText}
                  onChange={(e) => setDomainsText(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                    Availability Schedule
                  </label>
                  <input
                    type="text"
                    value={availabilitySchedule}
                    onChange={(e) => setAvailabilitySchedule(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                    Max Sessions / Week
                  </label>
                  <input
                    type="number"
                    value={maxSessionsPerWeek}
                    onChange={(e) => setMaxSessionsPerWeek(Number(e.target.value))}
                    min={1}
                    max={20}
                    className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                    Preferred Timezone
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
                    Compensation / Honorarium
                  </label>
                  <input
                    type="text"
                    value={honorarium}
                    onChange={(e) => setHonorarium(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                  />
                </div>
              </div>
            </form>
          )}

          {/* Section 2: Assessment Capabilities */}
          {activeSection === 'skill' && (
            <div className="space-y-6">
              {/* Existing Skills List */}
              <div className="space-y-3">
                <span className="text-xs font-mono uppercase text-[#8b949e]">
                  Active Evaluation Capabilities ({profile.skills.length})
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
                          <span className="text-[#00d992]">{skill.level}</span>
                          <span>•</span>
                          <span>{skill.interviewsConducted} mocks</span>
                          <span>•</span>
                          <span>{skill.category}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill.id)}
                        className="text-xs text-[#8b949e] hover:text-red-400 p-1 cursor-pointer transition-colors"
                        title="Remove capability"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form to Add New Capability */}
              <form onSubmit={handleAddSkill} id="interviewer-skill-form" className="space-y-4 pt-3 border-t border-[#3d3a39]">
                <span className="text-xs font-mono uppercase text-[#00d992] flex items-center gap-1.5">
                  <span>+</span> Add New Capability
                </span>

                <div>
                  <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                    Evaluation Skill / Specialty Name
                  </label>
                  <input
                    type="text"
                    value={skillName}
                    onChange={(e) => setSkillName(e.target.value)}
                    placeholder="e.g., Cross-Datacenter Replication & Failure Recovery"
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
                      <option value="Leadership">Leadership</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                      Assessment Level
                    </label>
                    <select
                      value={skillLevel}
                      onChange={(e) => setSkillLevel(e.target.value as any)}
                      className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                    >
                      <option value="Staff Bar Raiser">Staff Bar Raiser</option>
                      <option value="Senior Assessor">Senior Assessor</option>
                      <option value="Domain Specialist">Domain Specialist</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                    Approximate Interviews Conducted
                  </label>
                  <input
                    type="number"
                    value={interviewsConducted}
                    onChange={(e) => setInterviewsConducted(Number(e.target.value))}
                    min={1}
                    max={500}
                    className="w-full bg-[#1a1a1a] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary px-4 py-2 text-xs cursor-pointer"
                >
                  Add Capability to Portfolio
                </button>
              </form>
            </div>
          )}

          {/* Section 3: Credentials & Experience */}
          {activeSection === 'credentials' && (
            <form onSubmit={handleSaveCredentials} id="interviewer-credentials-form" className="space-y-4">
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
                    Years Active Interviewing
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
                  placeholder="e.g. Certified Principal Interview Bar Raiser, Distributed Architecture Hiring Committee Member"
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
            className="btn-outline px-4 py-2 text-xs"
          >
            Close
          </button>
          {activeSection === 'context' && (
            <button
              type="submit"
              form="interviewer-context-form"
              className="btn-primary px-4 py-2 text-xs"
            >
              Save Philosophy & Formats
            </button>
          )}
          {activeSection === 'credentials' && (
            <button
              type="submit"
              form="interviewer-credentials-form"
              className="btn-primary px-4 py-2 text-xs"
            >
              Save Credentials
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
