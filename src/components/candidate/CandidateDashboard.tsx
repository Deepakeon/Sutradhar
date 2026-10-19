'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { MatchingInterviewer, InterviewSession } from '@/types';
import { RequestInterviewModal } from './RequestInterviewModal';
import { CandidateProfileEditorModal } from './CandidateProfileEditorModal';
import { ViewQuestionnaireModal } from '@/components/common/ViewQuestionnaireModal';

export function CandidateDashboard() {
  const {
    currentUser,
    activeTab,
    setActiveTab,
    matchingInterviewers,
    sessions,
    updateSessionStatus,
    updateCandidateProfile,
    showToast
  } = useApp();

  const profile = currentUser.candidateProfile;

  // Modals state
  const [selectedInterviewer, setSelectedInterviewer] = useState<MatchingInterviewer | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorSection, setEditorSection] = useState<'context' | 'skill' | 'experience'>('context');
  const [scorecardSession, setScorecardSession] = useState<InterviewSession | null>(null);

  // Search & Filter state for Matching Interviewers
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');

  // Requests/Meetings filter
  const [sessionsFilter, setSessionsFilter] = useState<'all' | 'accepted' | 'pending' | 'completed'>('all');

  // Candidate sessions
  const candidateSessions = sessions.filter((s) => s.candidateId === currentUser.id);

  const upcomingAcceptedSession = candidateSessions.find((s) => s.status === 'accepted');

  const filteredInterviewers = matchingInterviewers
    .filter((interviewer) => {
      const matchesSearch =
        interviewer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        interviewer.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        interviewer.keySkills.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase())) ||
        interviewer.domains.some((d) => d.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDomain =
        selectedDomain === 'all' ||
        interviewer.domains.some((d) => d.toLowerCase().includes(selectedDomain.toLowerCase()));

      return matchesSearch && matchesDomain;
    })
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  const filteredSessions = candidateSessions.filter((s) => {
    if (sessionsFilter === 'all') return true;
    return s.status === sessionsFilter;
  });

  const handleOpenEditor = (section: 'context' | 'skill' | 'experience') => {
    setEditorSection(section);
    setIsEditorOpen(true);
  };

  const handleDeleteSkill = (skillId: string) => {
    updateCandidateProfile({
      skills: profile.skills.filter((s) => s.id !== skillId)
    });
    showToast('Skill removed from candidate profile', 'info');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Hero Welcome Card */}
          <div className="rounded-[8px] bg-[#1a1a1a] border border-[#3d3a39] p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/40">
                    CANDIDATE MODE
                  </span>
                  <span className="text-xs text-[#8b949e] font-mono">
                    Account: {currentUser.name}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-normal text-[#ffffff] tracking-tight">
                  Prepare for Staff & Principal Calibrations
                </h1>
                <p className="text-sm sm:text-base text-[#bdbdbd] max-w-2xl leading-relaxed">
                  {profile.headline}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={() => setActiveTab('match')}
                  className="btn-primary text-sm px-4 py-2.5 cursor-pointer"
                >
                  Browse Interviewers →
                </button>
                <button
                  onClick={() => handleOpenEditor('context')}
                  className="btn-outline text-sm px-4 py-2.5 cursor-pointer"
                >
                  Edit Profile
                </button>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-[#3d3a39]/70">
              <div className="p-3.5 rounded-[6px] bg-[#101010] border border-[#3d3a39]">
                <span className="text-[11px] uppercase font-mono tracking-wider text-[#8b949e]">
                  Upcoming Mocks
                </span>
                <div className="text-2xl font-bold text-[#f2f2f2] mt-1">
                  {candidateSessions.filter((s) => s.status === 'accepted').length}
                </div>
                <span className="text-[10px] text-[#00d992] font-mono">
                  {upcomingAcceptedSession ? 'Next: Tomorrow' : 'No mocks scheduled'}
                </span>
              </div>

              <div className="p-3.5 rounded-[6px] bg-[#101010] border border-[#3d3a39]">
                <span className="text-[11px] uppercase font-mono tracking-wider text-[#8b949e]">
                  Top Bar Raisers
                </span>
                <div className="text-2xl font-bold text-[#f2f2f2] mt-1">
                  {matchingInterviewers.length}
                </div>
                <span className="text-[10px] text-[#00d992] font-mono">
                  Up to 98% compatibility
                </span>
              </div>

              <div className="p-3.5 rounded-[6px] bg-[#101010] border border-[#3d3a39]">
                <span className="text-[11px] uppercase font-mono tracking-wider text-[#8b949e]">
                  Pending Requests
                </span>
                <div className="text-2xl font-bold text-[#f2f2f2] mt-1">
                  {candidateSessions.filter((s) => s.status === 'pending').length}
                </div>
                <span className="text-[10px] text-[#bdbdbd] font-mono">
                  Awaiting confirmation
                </span>
              </div>

              <div className="p-3.5 rounded-[6px] bg-[#101010] border border-[#3d3a39]">
                <span className="text-[11px] uppercase font-mono tracking-wider text-[#8b949e]">
                  Verified Skills
                </span>
                <div className="text-2xl font-bold text-[#f2f2f2] mt-1">
                  {profile.skills.length}
                </div>
                <span className="text-[10px] text-[#00d992] font-mono">
                  {profile.skills.filter((s) => s.proficiency === 'Expert').length} Expert levels
                </span>
              </div>
            </div>
          </div>

          {/* Upcoming Mock Session Spotlight Banner */}
          {upcomingAcceptedSession && (
            <div className="rounded-[8px] bg-[#101010] border-2 border-[#00d992]/60 p-6 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00d992] animate-ping" />
                    <span className="text-xs uppercase font-mono font-bold tracking-wider text-[#00d992]">
                      Next Scheduled Mock Session
                    </span>
                    <span className="text-xs text-[#8b949e] font-mono">
                      • {upcomingAcceptedSession.scheduledAt}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-[#ffffff]">
                    {upcomingAcceptedSession.format} with {upcomingAcceptedSession.interviewerName}
                  </h3>
                  <p className="text-xs text-[#bdbdbd]">
                    Interviewer: {upcomingAcceptedSession.interviewerName} ({upcomingAcceptedSession.interviewerCompany})
                  </p>
                  {upcomingAcceptedSession.candidateNotes && (
                    <p className="text-xs text-[#8b949e] italic mt-1">
                      Focus: &ldquo;{upcomingAcceptedSession.candidateNotes}&rdquo;
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <a
                    href={upcomingAcceptedSession.meetingUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary text-xs px-4 py-2 cursor-pointer flex items-center gap-2"
                  >
                    <span>⚡ Launch Mock Room</span>
                  </a>
                  <button
                    onClick={() => setActiveTab('sessions')}
                    className="btn-outline text-xs px-4 py-2 cursor-pointer"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Dual Column: Top Ranked Interviewers Preview & Candidate Focus */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Ranked Interviewers Preview (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#f2f2f2]">
                    Top Matching Interviewers
                  </h3>
                  <p className="text-xs text-[#8b949e]">
                    Ranked by technical domain alignment and target company calibrators
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('match')}
                  className="text-xs font-semibold text-[#2fd6a1] hover:text-[#00d992] cursor-pointer"
                >
                  View All ({matchingInterviewers.length}) →
                </button>
              </div>

              <div className="space-y-3">
                {matchingInterviewers.slice(0, 2).map((interviewer) => (
                  <div
                    key={interviewer.id}
                    className="p-5 rounded-[8px] bg-[#1a1a1a] border border-[#3d3a39] hover:border-[#00d992]/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={interviewer.avatar}
                        alt={interviewer.name}
                        className="w-12 h-12 rounded-full border border-[#3d3a39] object-cover flex-shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[#f2f2f2]">
                            {interviewer.name}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/40">
                            {interviewer.compatibilityScore}% MATCH
                          </span>
                        </div>
                        <p className="text-xs text-[#bdbdbd]">
                          {interviewer.currentTitle} • {interviewer.company} ({interviewer.yearsExperience} yrs exp)
                        </p>
                        <p className="text-xs text-[#8b949e] mt-1 line-clamp-1">
                          {interviewer.compatibilityReason}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedInterviewer(interviewer)}
                      className="btn-outline text-xs px-3.5 py-1.5 self-end sm:self-center flex-shrink-0 cursor-pointer"
                    >
                      Request Mock
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Candidate Context Summary (1 col) */}
            <div className="rounded-[8px] bg-[#1a1a1a] border border-[#3d3a39] p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#3d3a39] pb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-[#8b949e]">
                  Active Prep Profile
                </span>
                <button
                  onClick={() => handleOpenEditor('context')}
                  className="text-xs text-[#2fd6a1] hover:text-[#00d992] cursor-pointer"
                >
                  Edit
                </button>
              </div>

              <div>
                <span className="text-[11px] font-mono text-[#8b949e] uppercase">Target Roles</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {profile.targetRoles.map((role) => (
                    <span key={role} className="pill-tag text-xs">
                      {role}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-mono text-[#8b949e] uppercase">Target Companies</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {profile.context.targetCompanies.map((c) => (
                    <span key={c} className="pill-tag-active text-xs">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-mono text-[#8b949e] uppercase">Timezone & Bandwidth</span>
                <p className="text-xs text-[#bdbdbd] mt-1 font-mono">
                  {profile.context.preferredTimezone} • {profile.context.weeklyAvailabilityHours} hrs/wk practice
                </p>
              </div>

              <div>
                <span className="text-[11px] font-mono text-[#8b949e] uppercase">Focus Areas</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {profile.context.interviewFocus.map((f) => (
                    <span key={f} className="text-[11px] font-mono text-[#bdbdbd] bg-[#101010] px-2 py-0.5 rounded-[4px] border border-[#3d3a39]">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Management Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#3d3a39]">
            <div>
              <h2 className="text-2xl font-normal text-[#f2f2f2]">
                Candidate Profile
              </h2>
              <p className="text-sm text-[#8b949e]">
                Manage context, skills, and past engineering experience for peer interview matching.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenEditor('context')}
                className="btn-outline text-xs px-3.5 py-2 cursor-pointer"
              >
                ✎ Edit Context
              </button>
              <button
                onClick={() => handleOpenEditor('skill')}
                className="btn-primary text-xs px-3.5 py-2 cursor-pointer"
              >
                + Add Skill
              </button>
              <button
                onClick={() => handleOpenEditor('experience')}
                className="btn-outline text-xs px-3.5 py-2 cursor-pointer"
              >
                + Add Experience
              </button>
            </div>
          </div>

          {/* Section 1: Candidate Context Card */}
          <div className="rounded-[8px] bg-[#1a1a1a] border border-[#3d3a39] p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#3d3a39]">
              <span className="text-xs font-mono uppercase tracking-[2.52px] text-[#8b949e]">
                01 • CONTEXT & TARGETS
              </span>
              <button
                onClick={() => handleOpenEditor('context')}
                className="text-xs font-semibold text-[#2fd6a1] hover:text-[#00d992] cursor-pointer"
              >
                Edit Context →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-mono text-[#8b949e] uppercase">Headline</span>
                  <p className="text-base text-[#f2f2f2] font-semibold mt-1">
                    {profile.headline}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-mono text-[#8b949e] uppercase">Career Objectives</span>
                  <p className="text-sm text-[#bdbdbd] mt-1 leading-relaxed">
                    {profile.context.careerObjectives}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-mono text-[#8b949e] uppercase">Target Roles</span>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {profile.targetRoles.map((role) => (
                      <span key={role} className="pill-tag text-xs font-medium">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-xs font-mono text-[#8b949e] uppercase">Target Companies</span>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {profile.context.targetCompanies.map((c) => (
                      <span key={c} className="pill-tag-active text-xs">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-mono text-[#8b949e] uppercase">Timezone</span>
                    <p className="text-sm text-[#f2f2f2] font-mono mt-1">
                      {profile.context.preferredTimezone}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-mono text-[#8b949e] uppercase">Weekly Availability</span>
                    <p className="text-sm text-[#f2f2f2] font-mono mt-1">
                      {profile.context.weeklyAvailabilityHours} hours / week
                    </p>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-mono text-[#8b949e] uppercase">Resume & Highlights Note</span>
                  <p className="text-xs text-[#bdbdbd] mt-1 font-mono bg-[#101010] p-3 rounded-[6px] border border-[#3d3a39]">
                    {profile.context.resumeNotes || 'No resume notes attached'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Technical Skills Grid */}
          <div className="rounded-[8px] bg-[#1a1a1a] border border-[#3d3a39] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#3d3a39]">
              <div>
                <span className="text-xs font-mono uppercase tracking-[2.52px] text-[#8b949e]">
                  02 • TECHNICAL SKILLS & PROFICIENCY ({profile.skills.length})
                </span>
              </div>
              <button
                onClick={() => handleOpenEditor('skill')}
                className="text-xs font-semibold text-[#00d992] hover:text-[#2fd6a1] cursor-pointer"
              >
                + Add Skill
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {profile.skills.map((skill) => (
                <div
                  key={skill.id}
                  className="p-3.5 rounded-[6px] bg-[#101010] border border-[#3d3a39] flex items-center justify-between group hover:border-[#00d992]/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#f2f2f2]">
                        {skill.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-[#8b949e]">
                      <span className="text-[#00d992]">{skill.proficiency}</span>
                      <span>•</span>
                      <span>{skill.yearsOfExperience} yrs</span>
                      <span>•</span>
                      <span>{skill.category}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteSkill(skill.id)}
                    className="opacity-0 group-hover:opacity-100 text-[#8b949e] hover:text-red-400 text-xs transition-opacity p-1 cursor-pointer"
                    title="Remove skill"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Engineering Experience */}
          <div className="rounded-[8px] bg-[#1a1a1a] border border-[#3d3a39] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#3d3a39]">
              <span className="text-xs font-mono uppercase tracking-[2.52px] text-[#8b949e]">
                03 • ENGINEERING EXPERIENCE ({profile.experience.length})
              </span>
              <button
                onClick={() => handleOpenEditor('experience')}
                className="text-xs font-semibold text-[#00d992] hover:text-[#2fd6a1] cursor-pointer"
              >
                + Add Experience
              </button>
            </div>

            <div className="space-y-4">
              {profile.experience.map((exp) => (
                <div
                  key={exp.id}
                  className="p-4 rounded-[6px] bg-[#101010] border border-[#3d3a39] space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <h4 className="text-base font-bold text-[#f2f2f2]">
                        {exp.title}
                      </h4>
                      <p className="text-xs text-[#00d992] font-mono">
                        {exp.company}
                      </p>
                    </div>
                    <span className="text-xs text-[#8b949e] font-mono">
                      {exp.period}
                    </span>
                  </div>

                  <ul className="list-disc list-inside space-y-1 text-xs text-[#bdbdbd] pt-1">
                    {exp.highlights.map((h, i) => (
                      <li key={i} className="leading-relaxed">
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Browse Matching Interviewers Tab */}
      {activeTab === 'match' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#3d3a39]">
            <div>
              <h2 className="text-2xl font-normal text-[#f2f2f2]">
                Ranked Interviewers
              </h2>
              <p className="text-sm text-[#8b949e]">
                Interview bar raisers matched dynamically against your technical domains and candidate profile.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#00d992]">
              <span className="w-2 h-2 rounded-full bg-[#00d992] animate-pulse" />
              <span>{filteredInterviewers.length} calibrators available</span>
            </div>
          </div>

          {/* Search & Domain Filter Bar */}
          <div className="p-4 rounded-[8px] bg-[#1a1a1a] border border-[#3d3a39] flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="w-full md:w-96 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by company (Stripe, Databricks...), skill, or name..."
                className="w-full bg-[#101010] border border-[#3d3a39] rounded-[6px] pl-3 pr-8 py-2 text-xs text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-[#8b949e] text-xs hover:text-[#f2f2f2]"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
              {['all', 'Consensus', 'Streaming', 'Failover', 'Real-Time'].map((domain) => (
                <button
                  key={domain}
                  onClick={() => setSelectedDomain(domain)}
                  className={`px-3 py-1 rounded-full text-xs font-mono transition-colors whitespace-nowrap cursor-pointer ${selectedDomain === domain
                      ? 'bg-[#00d992]/20 text-[#00d992] border border-[#00d992]/40 font-semibold'
                      : 'bg-[#101010] text-[#8b949e] border border-[#3d3a39] hover:text-[#f2f2f2]'
                    }`}
                >
                  {domain === 'all' ? 'All Domains' : domain}
                </button>
              ))}
            </div>
          </div>

          {/* Interviewers Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredInterviewers.map((interviewer) => (
              <div
                key={interviewer.id}
                className="rounded-[8px] bg-[#1a1a1a] border border-[#3d3a39] hover:border-[#00d992]/50 transition-all p-6 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-4">
                  {/* Top row: Avatar, Name, Compatibility Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={interviewer.avatar}
                        alt={interviewer.name}
                        className="w-14 h-14 rounded-full border border-[#3d3a39] object-cover flex-shrink-0"
                      />
                      <div>
                        <h3 className="text-base font-bold text-[#f2f2f2]">
                          {interviewer.name}
                        </h3>
                        <p className="text-xs text-[#00d992] font-semibold">
                          {interviewer.currentTitle} • {interviewer.company}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-[#8b949e] font-mono">
                          <span>{interviewer.yearsExperience} yrs tenure</span>
                          <span>•</span>
                          <span className="text-amber-300">★ {interviewer.rating}</span>
                          <span>•</span>
                          <span>{interviewer.interviewsCount} mocks held</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/50">
                        {interviewer.compatibilityScore}% MATCH
                      </span>
                    </div>
                  </div>

                  {/* Compatibility Rationale Callout */}
                  <div className="p-3 rounded-[6px] bg-[#101010] border border-[#3d3a39] text-xs text-[#bdbdbd]">
                    <span className="font-mono text-[#00d992] font-semibold mr-1.5">
                      Why matched:
                    </span>
                    {interviewer.compatibilityReason}
                  </div>

                  <p className="text-xs text-[#8b949e] leading-relaxed">
                    {interviewer.bio}
                  </p>

                  {/* Skills & Formats */}
                  <div className="space-y-2 pt-2 border-t border-[#3d3a39]/70">
                    <div className="flex flex-wrap gap-1.5">
                      {interviewer.keySkills.map((sk) => (
                        <span key={sk} className="pill-tag text-[11px]">
                          {sk}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-[#8b949e]">
                      <span className="text-[#00d992]">⚡ Next Slot:</span>
                      <span>{interviewer.availability}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-4 border-t border-[#3d3a39] flex items-center justify-between">
                  <span className="text-xs text-[#8b949e] font-mono">
                    Free Peer Barter
                  </span>
                  <button
                    onClick={() => setSelectedInterviewer(interviewer)}
                    className="btn-primary text-xs px-4 py-2 cursor-pointer"
                  >
                    Request Mock Interview
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requests & Scheduled Meetings Tab */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#3d3a39]">
            <div>
              <h2 className="text-2xl font-normal text-[#f2f2f2]">
                Requests & Scheduled Meetings
              </h2>
              <p className="text-sm text-[#8b949e]">
                Track incoming invitations, pending requests sent to interviewers, and scheduled mock interview sessions.
              </p>
            </div>
            {/* Filter pills */}
            <div className="flex items-center gap-2">
              {(['all', 'accepted', 'pending', 'completed'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSessionsFilter(filter)}
                  className={`px-3 py-1 rounded-[6px] text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${sessionsFilter === filter
                      ? 'bg-[#1a1a1a] text-[#00d992] border border-[#00d992]/40 font-semibold'
                      : 'text-[#8b949e] hover:text-[#f2f2f2]'
                    }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="rounded-[8px] bg-[#1a1a1a] border border-[#3d3a39] p-12 text-center space-y-3">
              <div className="text-3xl">📅</div>
              <h3 className="text-base font-semibold text-[#f2f2f2]">
                No sessions found under this filter
              </h3>
              <p className="text-xs text-[#8b949e] max-w-md mx-auto">
                Explore our list of senior interviewers to book a mock session or change your filter.
              </p>
              <button
                onClick={() => setActiveTab('match')}
                className="btn-primary text-xs px-4 py-2 mt-2 cursor-pointer"
              >
                Browse Interviewers
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSessions.map((session) => {
                const isAccepted = session.status === 'accepted';
                const isPending = session.status === 'pending';
                const isCompleted = session.status === 'completed';

                return (
                  <div
                    key={session.id}
                    className="p-5 rounded-[8px] bg-[#1a1a1a] border border-[#3d3a39] space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={session.interviewerAvatar}
                          alt={session.interviewerName}
                          className="w-12 h-12 rounded-full border border-[#3d3a39] object-cover flex-shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-[#f2f2f2]">
                              {session.format}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${isAccepted
                                  ? 'bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/40'
                                  : isPending
                                    ? 'bg-amber-400/15 text-amber-400 border border-amber-400/40'
                                    : 'bg-zinc-700/30 text-[#8b949e] border border-zinc-700'
                                }`}
                            >
                              {session.status}
                            </span>
                          </div>
                          <p className="text-xs text-[#bdbdbd]">
                            Interviewer: {session.interviewerName} • {session.interviewerCompany}
                          </p>
                          <p className="text-xs text-[#8b949e] font-mono mt-0.5">
                            Scheduled: {session.scheduledAt}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {isAccepted && session.meetingUrl && (
                          <a
                            href={session.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>⚡ Launch Room</span>
                          </a>
                        )}

                        {isPending && (
                          <button
                            onClick={() => updateSessionStatus(session.id, 'cancelled')}
                            className="btn-outline text-xs px-3 py-1.5 text-red-400 hover:text-red-300 hover:border-red-500/40 cursor-pointer"
                          >
                            Cancel Request
                          </button>
                        )}

                        {isCompleted && session.questionnaire && (
                          <button
                            onClick={() => setScorecardSession(session)}
                            className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>★ View Evaluation Scorecard</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {session.candidateNotes && (
                      <div className="p-3 rounded-[6px] bg-[#101010] border border-[#3d3a39] text-xs text-[#8b949e]">
                        <span className="font-mono text-[#bdbdbd] font-semibold mr-1.5">
                          Candidate Notes / Goals:
                        </span>
                        {session.candidateNotes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Request Interview Flow */}
      {selectedInterviewer && (
        <RequestInterviewModal
          interviewer={selectedInterviewer}
          onClose={() => setSelectedInterviewer(null)}
        />
      )}

      {/* Modal: Candidate Profile Editor */}
      {isEditorOpen && (
        <CandidateProfileEditorModal
          initialSection={editorSection}
          onClose={() => setIsEditorOpen(false)}
        />
      )}

      {/* Modal: Scorecard Viewer */}
      {scorecardSession && (
        <ViewQuestionnaireModal
          session={scorecardSession}
          onClose={() => setScorecardSession(null)}
        />
      )}
    </div>
  );
}
