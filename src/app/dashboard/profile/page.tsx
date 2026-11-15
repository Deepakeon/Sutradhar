'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useProfile } from '@/hooks/use-profile';
import { UserProfileEditorModal } from '@/components/user/UserProfileEditorModal';
import { SkillProficiency, JobDescription, JDSkillItem, SkillImportance } from '@/types';

// Curated platform skills for autocomplete
const COMMON_SYSTEM_SKILLS = [
  'Distributed Systems',
  'System Design & Architecture',
  'Kubernetes & Containers',
  'Kafka & Event Streaming',
  'PostgreSQL & Query Tuning',
  'Database Internals (LSM/B-Tree)',
  'Consensus Protocols (Raft/Paxos)',
  'eBPF & Linux Kernel',
  'Microservices & Mesh',
  'Go (Golang)',
  'Rust',
  'Python',
  'TypeScript',
  'gRPC & Protocol Buffers',
  'Redis & Caching',
  'Concurrency & Multithreading',
  'Observability (Prometheus/OpenTelemetry)',
  'CI/CD & Terraform',
  'AWS Cloud Architecture',
  'GCP Cloud Infrastructure',
  'Network Protocols (TCP/QUIC)',
  'ClickHouse & OLAP',
  'Security & IAM',
  'Site Reliability Engineering (SRE)',
  'GraphQL',
  'React / Next.js',
  'Docker',
  'Performance & GC Profiling'
];

interface SkillBucketProps {
  classification: SkillImportance;
  title: string;
  badgeLabel: string;
  badgeStyle: string;
  boxBorder: string;
  subtitle: string;
  skills: JDSkillItem[];
  onAddSkill: (classification: SkillImportance, skillName: string) => void;
  onRemoveSkill: (skillId: string) => void;
  existingSkillNames: string[];
  suggestionsPool: string[];
}

function SkillBucket({
  classification,
  title,
  badgeLabel,
  badgeStyle,
  boxBorder,
  subtitle,
  skills,
  onAddSkill,
  onRemoveSkill,
  existingSkillNames,
  suggestionsPool
}: SkillBucketProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredSuggestions = suggestionsPool
    .filter(
      (s) =>
        !existingSkillNames.includes(s.toLowerCase()) &&
        s.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 7);

  const handleSelect = (name: string) => {
    onAddSkill(classification, name);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className={`rounded-[10px] bg-[#121212] border ${boxBorder} p-3.5 flex flex-col justify-between space-y-3 shadow-xs`}>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-[4px] uppercase tracking-wider ${badgeStyle}`}>
            {badgeLabel}
          </span>
          <span className="text-[10.5px] font-mono text-[#8b949e]">
            {skills.length} {skills.length === 1 ? 'skill' : 'skills'}
          </span>
        </div>
        <p className="text-[11px] text-[#8b949e] leading-snug">
          {subtitle}
        </p>
      </div>

      {/* Autocomplete Search Bar */}
      <div className="relative">
        <div className="relative flex items-center">
          <span className="absolute left-2.5 text-[#8b949e] text-xs pointer-events-none select-none">
            🔍
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => {
              setTimeout(() => setIsOpen(false), 200);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (query.trim()) {
                  handleSelect(query.trim());
                }
              }
            }}
            placeholder={`+ Add ${title} skill...`}
            className="w-full bg-[#0a0a0a] border border-[#3d3a39] rounded-[6px] pl-7 pr-7 py-1.5 text-xs text-[#f2f2f2] placeholder:text-[#6b7280] focus:outline-hidden focus:border-[#00d992] transition-colors font-mono"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 text-[#8b949e] hover:text-[#f2f2f2] text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 z-40 bg-[#181818] border border-[#3d3a39] rounded-[8px] shadow-2xl max-h-48 overflow-y-auto divide-y divide-[#262626]">
            {query.trim() && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(query.trim());
                }}
                className="w-full text-left px-3 py-2 text-xs font-mono text-[#00d992] hover:bg-[#202020] flex items-center justify-between cursor-pointer"
              >
                <span>+ Add &ldquo;{query.trim()}&rdquo;</span>
                <span className="text-[9.5px] uppercase font-sans text-[#8b949e] px-1.5 py-0.5 rounded bg-[#101010]">
                  Custom
                </span>
              </button>
            )}

            {filteredSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(suggestion);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-[#d1d5db] hover:text-[#ffffff] hover:bg-[#222222] font-mono flex items-center justify-between cursor-pointer transition-colors"
              >
                <span>{suggestion}</span>
                <span className="text-[10px] text-[#8b949e] opacity-60">+ Select</span>
              </button>
            ))}

            {!query.trim() && filteredSuggestions.length === 0 && (
              <div className="p-3 text-center text-xs text-[#8b949e] font-mono">
                All common skills added
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Skill Tags within this Bucket */}
      <div className="min-h-[72px] p-2 rounded-[6px] bg-[#0c0c0c] border border-[#2b2b2b] flex flex-wrap content-start gap-1.5">
        {skills.length === 0 ? (
          <div className="w-full h-full min-h-[56px] flex items-center justify-center text-center text-[10.5px] text-[#6b7280] font-mono italic">
            No {title.toLowerCase()} skills yet.
          </div>
        ) : (
          skills.map((sk) => (
            <span
              key={sk.id}
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[11px] font-mono font-medium ${badgeStyle}`}
            >
              <span>{sk.name}</span>
              <button
                type="button"
                onClick={() => onRemoveSkill(sk.id)}
                className="hover:text-red-400 text-xs ml-0.5 cursor-pointer opacity-70 hover:opacity-100"
                title="Remove"
              >
                ✕
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { matchingCandidates, showToast } = useApp();
  const {
    profile,
    currentUser,
    isLoading,
    isSaving,
    isSynced,
    createJobDescription,
    deleteJobDescription,
    deleteSkill
  } = useProfile();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorSection, setEditorSection] = useState<'context' | 'skill' | 'credentials'>('context');

  const handleOpenEditor = (section: 'context' | 'skill' | 'credentials' = 'context') => {
    setEditorSection(section);
    setIsEditorOpen(true);
  };

  // Job Description (JD) State
  const [isCreatingJD, setIsCreatingJD] = useState(false);
  const [jdRoleTitle, setJdRoleTitle] = useState('');
  const [jdNote, setJdNote] = useState('');
  const [jdTiming, setJdTiming] = useState('');
  const [jdSkills, setJdSkills] = useState<JDSkillItem[]>([]);

  // Collect skills from pool, user profile, and candidates
  const candidateSkills = (matchingCandidates || []).flatMap((c) =>
    c.skills ? c.skills.map((s) => s.name) : c.keySkills || []
  );
  const userSkills = (profile.skills || []).map((s) => s.name);
  const allAvailableSkills = Array.from(
    new Set([...COMMON_SYSTEM_SKILLS, ...userSkills, ...candidateSkills])
  ).sort();

  const handleAddSkillToBucket = (classification: SkillImportance, skillName: string) => {
    const trimmed = skillName.trim();
    if (!trimmed) return;
    if (jdSkills.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`"${trimmed}" is already added to this JD`, 'info');
      return;
    }
    const item: JDSkillItem = {
      id: `jd_sk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: trimmed,
      classification
    };
    setJdSkills((prev) => [...prev, item]);
  };

  const handleRemoveSkillFromJD = (skillId: string) => {
    setJdSkills((prev) => prev.filter((s) => s.id !== skillId));
  };

  const handleCreateJD = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jdRoleTitle.trim()) {
      showToast('Please specify a role title for the Job Description', 'warning');
      return;
    }
    const newJD: JobDescription = {
      id: `jd_${Date.now()}`,
      roleTitle: jdRoleTitle.trim(),
      note: jdNote.trim(),
      timingAvailable: jdTiming.trim() || 'Flexible / Upon Request',
      skills: jdSkills,
      createdAt: new Date().toISOString().split('T')[0]
    };

    createJobDescription(newJD);

    setJdRoleTitle('');
    setJdNote('');
    setJdTiming('');
    setJdSkills([]);
    setIsCreatingJD(false);
  };

  const handleDeleteJD = (jdId: string) => {
    deleteJobDescription(jdId);
  };

  const getImportanceBadgeStyle = (classification: SkillImportance) => {
    switch (classification) {
      case 'Important':
        return 'bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/40';
      case 'Additional':
        return 'bg-sky-500/15 text-sky-400 border border-sky-500/40';
      case 'Bonus':
        return 'bg-amber-400/15 text-amber-400 border border-amber-400/40';
      default:
        return 'bg-zinc-800 text-[#bdbdbd] border border-zinc-700';
    }
  };

  const handleDeleteSkill = (skillId: string) => {
    deleteSkill(skillId);
  };

  const getProficiencyBadgeStyle = (proficiency?: SkillProficiency | string) => {
    switch (proficiency) {
      case 'Expert':
        return 'bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/40';
      case 'Intermediate':
        return 'bg-sky-500/15 text-sky-400 border border-sky-500/40';
      case 'Beginner':
        return 'bg-amber-400/15 text-amber-400 border border-amber-400/40';
      default:
        return 'bg-zinc-800 text-[#bdbdbd] border border-zinc-700';
    }
  };

  // Fallbacks if user profile has empty fields - strictly sanitize against non-string objects {}
  const headline = (typeof profile.headline === 'string' && profile.headline.trim())
    ? profile.headline
    : 'Senior Distributed Systems Engineer targeting Staff / Principal Roles';

  const objectives = (typeof profile.objectives === 'string' && profile.objectives.trim())
    ? profile.objectives
    : 'Transitioning from Senior to Staff level at top-tier distributed data infrastructure companies. Honing deep system design trade-offs, catastrophic failure scenarios, and multi-tenant partitioning strategies.';

  const rawRoles = Array.isArray(profile.targetRoles) ? profile.targetRoles : [];
  const safeTargetRoles = rawRoles.filter((r): r is string => typeof r === 'string' && r.trim().length > 0);
  const targetRoles = safeTargetRoles.length > 0
    ? safeTargetRoles
    : [
        'Staff Distributed Systems Engineer',
        'Principal Infrastructure Architect',
        'Lead Storage Engine Developer'
      ];

  const timezone = (typeof profile.timezone === 'string' && profile.timezone.trim())
    ? profile.timezone
    : (typeof profile.context?.preferredTimezone === 'string' ? profile.context.preferredTimezone : 'America/New_York (UTC-5)');

  const weeklyAvailability = (typeof profile.weeklyAvailability === 'string' && profile.weeklyAvailability.trim())
    ? profile.weeklyAvailability
    : (typeof profile.context?.availabilitySchedule === 'string' ? profile.context.availabilitySchedule : '8 hours / week');

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#3d3a39]">
        <div>
          <h2 className="text-2xl font-normal text-[#f2f2f2] tracking-tight">
            My Profile
          </h2>
          <p className="text-sm text-[#8b949e]">
            Context, career objectives, target roles, technical proficiency, and calibration job descriptions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenEditor('context')}
            className="inline-flex items-center justify-center font-semibold rounded-[6px] bg-[#00d992] text-[#101010] hover:bg-[#2fd6a1] transition-all text-xs px-4 py-2 cursor-pointer flex items-center gap-2 shadow-xs"
          >
            <span>✎</span>
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          Card 1: Context and Target
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-[12px] bg-[#1a1a1a] border border-[#3d3a39] p-6 space-y-6 shadow-xs hover:border-[#00d992]/40 transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-[#3d3a39]/70">
          <span className="text-xs font-mono uppercase tracking-[2.52px] text-[#8b949e]">
            01 • CONTEXT AND TARGET
          </span>
          <button
            onClick={() => handleOpenEditor('context')}
            className="text-xs font-semibold text-[#2fd6a1] hover:text-[#00d992] cursor-pointer"
          >
            Edit Context & Target →
          </button>
        </div>

        <div className="space-y-5">
          {/* Headline */}
          <div>
            <span className="text-xs font-mono text-[#8b949e] uppercase tracking-wider">
              Headline
            </span>
            <p className="text-base text-[#f2f2f2] font-semibold mt-1">
              {headline}
            </p>
          </div>

          {/* Objectives */}
          <div>
            <span className="text-xs font-mono text-[#8b949e] uppercase tracking-wider">
              Objectives
            </span>
            <p className="text-sm text-[#bdbdbd] mt-1 leading-relaxed bg-[#111111] p-3.5 rounded-[8px] border border-[#3d3a39]">
              {objectives}
            </p>
          </div>

          {/* Target Roles - Free Text */}
          <div>
            <span className="text-xs font-mono text-[#8b949e] uppercase tracking-wider">
              Target Roles
            </span>
            <div className="flex flex-wrap gap-2 mt-2">
              {targetRoles.map((role) => {
                const roleText = typeof role === 'string' ? role : '';
                if (!roleText) return null;
                return (
                  <div
                    key={roleText}
                    className="inline-flex items-center gap-2 rounded-[6px] border border-[#3d3a39] bg-[#111111] px-3 py-1.5 text-xs font-medium text-[#f2f2f2]"
                  >
                    <span className="text-[#00d992]">✦</span>
                    <span>{roleText}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timezone and Weekly Availability */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#3d3a39]/60">
            <div className="p-3.5 rounded-[8px] bg-[#111111] border border-[#3d3a39]">
              <span className="text-xs font-mono text-[#8b949e] uppercase tracking-wider">
                Timezone
              </span>
              <p className="text-sm text-[#f2f2f2] font-mono mt-1 font-semibold">
                {timezone}
              </p>
            </div>

            <div className="p-3.5 rounded-[8px] bg-[#111111] border border-[#3d3a39]">
              <span className="text-xs font-mono text-[#8b949e] uppercase tracking-wider">
                Weekly Availability
              </span>
              <p className="text-sm text-[#00d992] font-mono mt-1 font-semibold">
                {weeklyAvailability}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          Card 2: Skills and PROFICIENCY
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-[12px] bg-[#1a1a1a] border border-[#3d3a39] p-6 space-y-5 shadow-xs hover:border-[#00d992]/40 transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-[#3d3a39]/70">
          <span className="text-xs font-mono uppercase tracking-[2.52px] text-[#8b949e]">
            02 • SKILLS AND PROFICIENCY ({profile.skills.length})
          </span>
          <button
            onClick={() => handleOpenEditor('skill')}
            className="text-xs font-semibold text-[#00d992] hover:text-[#2fd6a1] cursor-pointer"
          >
            Manage Skills & Proficiency →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profile.skills.map((skill) => {
            const proficiency = skill.proficiency || 'Expert';
            return (
              <div
                key={skill.id}
                className="p-4 rounded-[10px] bg-[#111111] border border-[#3d3a39] flex items-center justify-between group hover:border-[#00d992]/50 transition-colors shadow-xs"
              >
                <div className="space-y-1.5 min-w-0 pr-2">
                  <h4 className="text-sm font-semibold text-[#f2f2f2] truncate">
                    {skill.name}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold uppercase tracking-wider ${getProficiencyBadgeStyle(
                        proficiency
                      )}`}
                    >
                      {proficiency}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteSkill(skill.id)}
                  className="opacity-0 group-hover:opacity-100 text-[#8b949e] hover:text-red-400 text-xs transition-opacity p-1 cursor-pointer flex-shrink-0"
                  title="Remove skill"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          Card 3: 03 • CALIBRATION JOB DESCRIPTIONS (JD)
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-[12px] bg-[#1a1a1a] border border-[#3d3a39] p-6 space-y-6 shadow-xs hover:border-[#00d992]/40 transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#3d3a39]/70">
          <div>
            <span className="text-xs font-mono uppercase tracking-[2.52px] text-[#8b949e]">
              03 • CALIBRATION JOB DESCRIPTIONS (JD) ({(profile.jobDescriptions || []).length})
            </span>
            <p className="text-xs text-[#8b949e] mt-0.5">
              Custom Job Descriptions with role titles, notes, classified skills (Important, Additional, Bonus), and availability.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreatingJD(!isCreatingJD)}
              className="inline-flex items-center gap-1.5 font-semibold rounded-[6px] bg-[#00d992] text-[#101010] hover:bg-[#2fd6a1] transition-all text-xs px-3.5 py-1.5 cursor-pointer shadow-xs"
            >
              <span>{isCreatingJD ? '✕ Cancel' : '+ Create JD'}</span>
            </button>
          </div>
        </div>

        {/* Inline Create JD Form */}
        {isCreatingJD && (
          <form
            onSubmit={handleCreateJD}
            className="p-5 rounded-[10px] bg-[#141414] border border-[#00d992]/50 space-y-4 animate-in fade-in duration-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#3d3a39]">
              <span className="text-xs font-mono uppercase font-bold text-[#00d992] tracking-wider flex items-center gap-1.5">
                <span>+</span> Create New Calibration Job Description (JD)
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingJD(false)}
                className="text-xs text-[#8b949e] hover:text-[#f2f2f2] cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                  Role Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={jdRoleTitle}
                  onChange={(e) => setJdRoleTitle(e.target.value)}
                  placeholder="e.g. Staff Distributed Systems Engineer"
                  className="w-full bg-[#111111] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                  Timing Available <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={jdTiming}
                  onChange={(e) => setJdTiming(e.target.value)}
                  placeholder="e.g. Tues & Thurs: 6:00 PM – 9:30 PM EST"
                  className="w-full bg-[#111111] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#bdbdbd] mb-1 uppercase font-mono">
                Note & Evaluation Context
              </label>
              <textarea
                value={jdNote}
                onChange={(e) => setJdNote(e.target.value)}
                placeholder="Describe key evaluation criteria, catastrophic drills, system trade-offs, and bar-raiser expectations..."
                rows={3}
                className="w-full bg-[#111111] border border-[#3d3a39] rounded-[6px] px-3 py-2 text-sm text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992]"
              />
            </div>

            {/* 3 Dedicated Classification Buckets */}
            <div className="space-y-3 pt-2 border-t border-[#3d3a39]/70">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="block text-xs font-medium text-[#bdbdbd] uppercase font-mono">
                  Classified Evaluation Skills ({jdSkills.length} Total)
                </label>
                <span className="text-[11px] text-[#8b949e] font-mono">
                  Type or pick from dropdown inside each category
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <SkillBucket
                  classification="Important"
                  title="Important"
                  badgeLabel="Important"
                  badgeStyle="bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/40"
                  boxBorder="border-[#00d992]/30 hover:border-[#00d992]/60"
                  subtitle="Core competencies & hard evaluation requirements"
                  skills={jdSkills.filter((s) => s.classification === 'Important')}
                  onAddSkill={handleAddSkillToBucket}
                  onRemoveSkill={handleRemoveSkillFromJD}
                  existingSkillNames={jdSkills.map((s) => s.name.toLowerCase())}
                  suggestionsPool={allAvailableSkills}
                />

                <SkillBucket
                  classification="Additional"
                  title="Additional"
                  badgeLabel="Additional"
                  badgeStyle="bg-sky-500/15 text-sky-400 border border-sky-500/40"
                  boxBorder="border-sky-500/30 hover:border-sky-500/60"
                  subtitle="Supporting capabilities & cross-domain capabilities"
                  skills={jdSkills.filter((s) => s.classification === 'Additional')}
                  onAddSkill={handleAddSkillToBucket}
                  onRemoveSkill={handleRemoveSkillFromJD}
                  existingSkillNames={jdSkills.map((s) => s.name.toLowerCase())}
                  suggestionsPool={allAvailableSkills}
                />

                <SkillBucket
                  classification="Bonus"
                  title="Bonus"
                  badgeLabel="Bonus"
                  badgeStyle="bg-amber-400/15 text-amber-400 border border-amber-400/40"
                  boxBorder="border-amber-400/30 hover:border-amber-400/60"
                  subtitle="Differentiating strengths & edge specializations"
                  skills={jdSkills.filter((s) => s.classification === 'Bonus')}
                  onAddSkill={handleAddSkillToBucket}
                  onRemoveSkill={handleRemoveSkillFromJD}
                  existingSkillNames={jdSkills.map((s) => s.name.toLowerCase())}
                  suggestionsPool={allAvailableSkills}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center font-semibold rounded-[6px] bg-[#00d992] text-[#101010] hover:bg-[#2fd6a1] transition-all text-xs px-4 py-2 cursor-pointer shadow-xs"
              >
                Save Job Description
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingJD(false)}
                className="inline-flex items-center justify-center font-semibold rounded-[6px] bg-[#111111] border border-[#3d3a39] text-[#bdbdbd] hover:text-[#f2f2f2] transition-all text-xs px-4 py-2 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Calibration JDs List */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-[2px] text-[#8b949e]">
              CALIBRATION ROLES & JDS ({(profile.jobDescriptions || []).length})
            </span>
            {(profile.jobDescriptions || []).length === 0 && !isCreatingJD && (
              <button
                onClick={() => setIsCreatingJD(true)}
                className="text-xs font-semibold text-[#00d992] hover:text-[#2fd6a1] cursor-pointer"
              >
                + Add your first JD
              </button>
            )}
          </div>

          {(profile.jobDescriptions || []).length === 0 ? (
            <div className="p-6 rounded-[10px] bg-[#111111] border border-[#3d3a39] text-center space-y-2">
              <p className="text-sm text-[#bdbdbd]">
                No Job Descriptions created yet for this profile.
              </p>
              <p className="text-xs text-[#8b949e]">
                Create a JD to calibrate candidate evaluations with specific role titles, notes, timing availability, and categorized skills.
              </p>
              <button
                onClick={() => setIsCreatingJD(true)}
                className="inline-flex items-center gap-1.5 font-semibold rounded-[6px] bg-[#00d992] text-[#101010] hover:bg-[#2fd6a1] transition-all text-xs px-4 py-2 cursor-pointer mt-2"
              >
                <span>+</span>
                <span>Create Role JD</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {(profile.jobDescriptions || []).map((jd) => {
                const importantSkills = jd.skills?.filter((s) => s.classification === 'Important') || [];
                const additionalSkills = jd.skills?.filter((s) => s.classification === 'Additional') || [];
                const bonusSkills = jd.skills?.filter((s) => s.classification === 'Bonus') || [];

                return (
                  <div
                    key={jd.id}
                    className="p-5 rounded-[10px] bg-[#111111] border border-[#3d3a39] space-y-4 hover:border-[#00d992]/40 transition-colors shadow-xs group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#3d3a39]/70">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-semibold text-[#f2f2f2]">
                            {jd.roleTitle}
                          </h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-[#1a1a1a] text-[#8b949e] border border-[#3d3a39]">
                            {jd.createdAt}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono text-[#00d992] flex items-center gap-1.5">
                            <span>⏱ Timing Available:</span>
                            <span className="text-[#f2f2f2]">{jd.timingAvailable}</span>
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteJD(jd.id)}
                        className="opacity-0 group-hover:opacity-100 text-[#8b949e] hover:text-red-400 text-xs transition-opacity p-1 cursor-pointer flex items-center gap-1 self-start sm:self-center"
                        title="Delete Job Description"
                      >
                        <span>✕</span>
                        <span>Delete</span>
                      </button>
                    </div>

                    {jd.note && (
                      <div className="p-3 rounded-[6px] bg-[#161616] border border-[#3d3a39]/60">
                        <span className="text-[11px] font-mono text-[#8b949e] uppercase block mb-1">
                          Role Note & Evaluation Context
                        </span>
                        <p className="text-xs text-[#bdbdbd] leading-relaxed">
                          {jd.note}
                        </p>
                      </div>
                    )}

                    {/* Classified Skills Display - 3 Category Buckets */}
                    {jd.skills && jd.skills.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <span className="text-[11px] font-mono text-[#8b949e] uppercase block">
                          Classified Evaluation Skills ({jd.skills.length})
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Important Box */}
                          <div className="rounded-[8px] bg-[#141414] border border-[#00d992]/30 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-[4px] bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/40 uppercase tracking-wider">
                                Important
                              </span>
                              <span className="text-[10px] font-mono text-[#8b949e]">
                                {importantSkills.length}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {importantSkills.length > 0 ? (
                                importantSkills.map((sk) => (
                                  <span
                                    key={sk.id}
                                    className="text-[11px] font-mono px-2 py-0.5 rounded-[4px] bg-[#00d992]/10 text-[#00d992] border border-[#00d992]/30"
                                  >
                                    {sk.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10.5px] text-[#6b7280] font-mono italic">
                                  None defined
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Additional Box */}
                          <div className="rounded-[8px] bg-[#141414] border border-sky-500/30 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-[4px] bg-sky-500/15 text-sky-400 border border-sky-500/40 uppercase tracking-wider">
                                Additional
                              </span>
                              <span className="text-[10px] font-mono text-[#8b949e]">
                                {additionalSkills.length}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {additionalSkills.length > 0 ? (
                                additionalSkills.map((sk) => (
                                  <span
                                    key={sk.id}
                                    className="text-[11px] font-mono px-2 py-0.5 rounded-[4px] bg-sky-500/10 text-sky-400 border border-sky-500/30"
                                  >
                                    {sk.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10.5px] text-[#6b7280] font-mono italic">
                                  None defined
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Bonus Box */}
                          <div className="rounded-[8px] bg-[#141414] border border-amber-400/30 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-[4px] bg-amber-400/15 text-amber-400 border border-amber-400/40 uppercase tracking-wider">
                                Bonus
                              </span>
                              <span className="text-[10px] font-mono text-[#8b949e]">
                                {bonusSkills.length}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {bonusSkills.length > 0 ? (
                                bonusSkills.map((sk) => (
                                  <span
                                    key={sk.id}
                                    className="text-[11px] font-mono px-2 py-0.5 rounded-[4px] bg-amber-400/10 text-amber-400 border border-amber-400/30"
                                  >
                                    {sk.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10.5px] text-[#6b7280] font-mono italic">
                                  None defined
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal: User Profile Editor */}
      {isEditorOpen && (
        <UserProfileEditorModal
          initialSection={editorSection}
          onClose={() => setIsEditorOpen(false)}
        />
      )}
    </div>
  );
}
