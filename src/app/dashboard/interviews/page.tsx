'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { MatchingCandidate, SkillProficiency } from '@/types';
import { InviteCandidateModal } from '@/components/user/InviteCandidateModal';

interface ProficiencyBucketProps {
  proficiency: SkillProficiency;
  title: string;
  badgeLabel: string;
  badgeStyle: string;
  boxBorder: string;
  subtitle: string;
  skills: string[];
  onAddSkill: (proficiency: SkillProficiency, skillName: string) => void;
  onRemoveSkill: (proficiency: SkillProficiency, skillName: string) => void;
  availableSkills: string[];
}

function ProficiencyBucket({
  proficiency,
  title,
  badgeLabel,
  badgeStyle,
  boxBorder,
  subtitle,
  skills,
  onAddSkill,
  onRemoveSkill,
  availableSkills
}: ProficiencyBucketProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredSuggestions = availableSkills
    .filter(
      (sk) =>
        !skills.some((s) => s.toLowerCase() === sk.toLowerCase()) &&
        sk.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 8);

  const handleSelect = (name: string) => {
    onAddSkill(proficiency, name);
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
          <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-[#181818] border border-[#3d3a39] rounded-[8px] shadow-2xl max-h-48 overflow-y-auto divide-y divide-[#262626]">
            {query.trim() && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(query.trim());
                }}
                className="w-full text-left px-3 py-2 text-xs font-mono text-[#00d992] hover:bg-[#202020] flex items-center justify-between cursor-pointer"
              >
                <span>+ Filter by &ldquo;{query.trim()}&rdquo;</span>
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
                <span className="text-[10px] text-[#00d992] opacity-70">+ Select</span>
              </button>
            ))}

            {!query.trim() && filteredSuggestions.length === 0 && (
              <div className="p-3 text-center text-xs text-[#8b949e] font-mono">
                All available skills selected
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Skill Tags within this Bucket */}
      <div className="min-h-[72px] p-2 rounded-[6px] bg-[#0c0c0c] border border-[#2b2b2b] flex flex-wrap content-start gap-1.5">
        {skills.length === 0 ? (
          <div className="w-full h-full min-h-[56px] flex items-center justify-center text-center text-[10.5px] text-[#6b7280] font-mono italic">
            No {title.toLowerCase()} skills filtered yet.
          </div>
        ) : (
          skills.map((sk) => (
            <span
              key={sk}
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[11px] font-mono font-medium ${badgeStyle}`}
            >
              <span>{sk}</span>
              <button
                type="button"
                onClick={() => onRemoveSkill(proficiency, sk)}
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

export default function BrowseInterviewsPage() {
  const { matchingCandidates } = useApp();

  const [selectedCandidate, setSelectedCandidate] = useState<MatchingCandidate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAvailability, setSelectedAvailability] = useState<string>('all');

  // 3 Dedicated Proficiency Buckets State
  const [expertSkills, setExpertSkills] = useState<string[]>([]);
  const [intermediateSkills, setIntermediateSkills] = useState<string[]>([]);
  const [beginnerSkills, setBeginnerSkills] = useState<string[]>([]);

  // Dynamically extract unique skills across candidates
  const availableSkills = Array.from(
    new Set(
      matchingCandidates.flatMap((c) =>
        c.skills ? c.skills.map((s) => s.name) : c.keySkills
      )
    )
  ).sort();

  const handleAddSkillToBucket = (level: SkillProficiency, skillName: string) => {
    const trimmed = skillName.trim();
    if (!trimmed) return;
    if (level === 'Expert') {
      if (!expertSkills.includes(trimmed)) setExpertSkills((prev) => [...prev, trimmed]);
    } else if (level === 'Intermediate') {
      if (!intermediateSkills.includes(trimmed)) setIntermediateSkills((prev) => [...prev, trimmed]);
    } else if (level === 'Beginner') {
      if (!beginnerSkills.includes(trimmed)) setBeginnerSkills((prev) => [...prev, trimmed]);
    }
  };

  const handleRemoveSkillFromBucket = (level: SkillProficiency, skillName: string) => {
    if (level === 'Expert') {
      setExpertSkills((prev) => prev.filter((s) => s !== skillName));
    } else if (level === 'Intermediate') {
      setIntermediateSkills((prev) => prev.filter((s) => s !== skillName));
    } else if (level === 'Beginner') {
      setBeginnerSkills((prev) => prev.filter((s) => s !== skillName));
    }
  };

  const totalBucketSkillsCount =
    expertSkills.length + intermediateSkills.length + beginnerSkills.length;

  const isFiltered =
    searchQuery !== '' ||
    selectedAvailability !== 'all' ||
    totalBucketSkillsCount > 0;

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedAvailability('all');
    setExpertSkills([]);
    setIntermediateSkills([]);
    setBeginnerSkills([]);
  };

  const getProficiencyStyle = (proficiency?: SkillProficiency | string) => {
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

  // Filter candidates based on searchbar, availability, and the 3 proficiency buckets
  const filteredCandidates = matchingCandidates
    .filter((candidate) => {
      // 1. Searchbar: roles, headline, objective (and name/company)
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        candidate.targetRole.toLowerCase().includes(q) ||
        (candidate.headline && candidate.headline.toLowerCase().includes(q)) ||
        (candidate.objective && candidate.objective.toLowerCase().includes(q)) ||
        candidate.careerGoals.toLowerCase().includes(q) ||
        candidate.name.toLowerCase().includes(q) ||
        candidate.currentCompany.toLowerCase().includes(q);

      // 2. Availability filter
      let matchesAvailability = true;
      if (selectedAvailability !== 'all') {
        const avail = (candidate.availability || '').toLowerCase();
        if (selectedAvailability === 'weekdays') {
          matchesAvailability =
            avail.includes('weekday') ||
            avail.includes('mon') ||
            avail.includes('tues') ||
            avail.includes('wed') ||
            avail.includes('thurs') ||
            avail.includes('fri');
        } else if (selectedAvailability === 'weekends') {
          matchesAvailability =
            avail.includes('weekend') ||
            avail.includes('sat') ||
            avail.includes('sun');
        } else if (selectedAvailability === 'evenings') {
          matchesAvailability =
            avail.includes('evening') ||
            avail.includes('pm') ||
            avail.includes('after');
        } else if (selectedAvailability === 'flexible') {
          matchesAvailability = avail.includes('flexible');
        }
      }

      // 3. 3-Bucket Proficiency Filter
      let matchesSkillBuckets = true;
      if (totalBucketSkillsCount > 0) {
        const candidateSkills =
          candidate.skills ||
          candidate.keySkills.map((k) => ({
            name: k,
            proficiency: 'Intermediate' as SkillProficiency
          }));

        const matchesExpert =
          expertSkills.length > 0 &&
          candidateSkills.some(
            (cs) =>
              cs.proficiency === 'Expert' &&
              expertSkills.some((es) => es.toLowerCase() === cs.name.toLowerCase())
          );

        const matchesIntermediate =
          intermediateSkills.length > 0 &&
          candidateSkills.some(
            (cs) =>
              cs.proficiency === 'Intermediate' &&
              intermediateSkills.some((is) => is.toLowerCase() === cs.name.toLowerCase())
          );

        const matchesBeginner =
          beginnerSkills.length > 0 &&
          candidateSkills.some(
            (cs) =>
              cs.proficiency === 'Beginner' &&
              beginnerSkills.some((bs) => bs.toLowerCase() === cs.name.toLowerCase())
          );

        matchesSkillBuckets = matchesExpert || matchesIntermediate || matchesBeginner;
      }

      return matchesSearch && matchesAvailability && matchesSkillBuckets;
    })
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#3d3a39]">
        <div>
          <h2 className="text-2xl font-normal text-[#f2f2f2] tracking-tight">
            Browse Interviews & Profiles
          </h2>
          <p className="text-sm text-[#8b949e]">
            Filter candidates by schedule availability, technical skills classified by proficiency level (Expert, Intermediate, Beginner), and search by roles or objectives.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-[#00d992] bg-[#00d992]/10 border border-[#00d992]/30 px-3 py-1.5 rounded-[6px]">
          <span className="w-2 h-2 rounded-full bg-[#00d992] animate-pulse" />
          <span>{filteredCandidates.length} candidate profiles available</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          2-COLUMN DISPLAY: FILTER PANEL (LEFT) + INTERVIEW CARDS (RIGHT)
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Filter Panel (4 cols on desktop, sticky) */}
        <aside className="lg:col-span-4 xl:col-span-4 lg:sticky lg:top-20 space-y-4">
          <div className="p-4 sm:p-5 rounded-[12px] bg-[#1a1a1a] border border-[#3d3a39] space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#3d3a39]/70 pb-3">
              <span className="text-[11px] font-mono uppercase tracking-[2px] text-[#8b949e] font-semibold flex items-center gap-2">
                <span>⚡</span>
                <span>FILTERS & PROFICIENCY</span>
              </span>
              {isFiltered && (
                <button
                  onClick={handleResetFilters}
                  className="text-[11px] font-mono text-[#00d992] hover:text-[#2fd6a1] cursor-pointer"
                >
                  Reset ✕
                </button>
              )}
            </div>

            {/* Searchbar: Roles, Headline, Objective */}
            <div>
              <label className="block text-xs font-mono uppercase text-[#8b949e] mb-1.5 font-semibold tracking-wider flex items-center justify-between">
                <span>Searchbar</span>
                {searchQuery && (
                  <span className="text-[10.5px] text-[#00d992] lowercase">
                    active
                  </span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-[#8b949e] text-xs">
                  🔍
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Role, headline, objective..."
                  className="w-full bg-[#111111] border border-[#3d3a39] rounded-[8px] pl-8 pr-8 py-2 text-xs text-[#f2f2f2] placeholder-[#8b949e]/70 focus:outline-hidden focus:border-[#00d992] transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-[#8b949e] hover:text-[#f2f2f2] text-xs cursor-pointer p-0.5"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Availability Schedule */}
            <div>
              <label className="block text-xs font-mono uppercase text-[#8b949e] mb-1.5 font-semibold tracking-wider">
                ⏱ Availability
              </label>
              <select
                value={selectedAvailability}
                onChange={(e) => setSelectedAvailability(e.target.value)}
                className="w-full bg-[#111111] border border-[#3d3a39] rounded-[8px] px-3 py-2 text-xs text-[#f2f2f2] focus:outline-hidden focus:border-[#00d992] transition-colors cursor-pointer"
              >
                <option value="all">All Availabilities</option>
                <option value="weekdays">Weekdays (Mon – Fri)</option>
                <option value="weekends">Weekends (Sat & Sun)</option>
                <option value="evenings">Evenings (Post 5 PM)</option>
                <option value="flexible">Flexible / Any Schedule</option>
              </select>
            </div>

            {/* 3 Dedicated Proficiency Buckets (Expert / Intermediate / Beginner) */}
            <div className="pt-3 border-t border-[#3d3a39]/70 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-mono uppercase text-[#8b949e] font-semibold tracking-wider">
                  ✦ Skills By Proficiency
                </label>
                <span className="text-[10px] font-mono text-[#8b949e]">
                  {totalBucketSkillsCount} active
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {/* Bucket 1: Expert */}
                <ProficiencyBucket
                  proficiency="Expert"
                  title="Expert"
                  badgeLabel="Expert Mastery"
                  badgeStyle="bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/40"
                  boxBorder="border-[#00d992]/30 hover:border-[#00d992]/60"
                  subtitle="Bar-raiser depth & architecture mastery"
                  skills={expertSkills}
                  onAddSkill={handleAddSkillToBucket}
                  onRemoveSkill={handleRemoveSkillFromBucket}
                  availableSkills={availableSkills}
                />

                {/* Bucket 2: Intermediate */}
                <ProficiencyBucket
                  proficiency="Intermediate"
                  title="Intermediate"
                  badgeLabel="Intermediate"
                  badgeStyle="bg-sky-500/15 text-sky-400 border border-sky-500/40"
                  boxBorder="border-sky-500/30 hover:border-sky-500/60"
                  subtitle="Solid practical production proficiency"
                  skills={intermediateSkills}
                  onAddSkill={handleAddSkillToBucket}
                  onRemoveSkill={handleRemoveSkillFromBucket}
                  availableSkills={availableSkills}
                />

                {/* Bucket 3: Beginner */}
                <ProficiencyBucket
                  proficiency="Beginner"
                  title="Beginner"
                  badgeLabel="Beginner"
                  badgeStyle="bg-amber-400/15 text-amber-400 border border-amber-400/40"
                  boxBorder="border-amber-400/30 hover:border-amber-400/60"
                  subtitle="Fundamental knowledge & baseline familiarity"
                  skills={beginnerSkills}
                  onAddSkill={handleAddSkillToBucket}
                  onRemoveSkill={handleRemoveSkillFromBucket}
                  availableSkills={availableSkills}
                />
              </div>
            </div>

            {/* Active Filters Summary (in left panel) */}
            {isFiltered && (
              <div className="pt-2 border-t border-[#3d3a39]/50 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-mono text-[#8b949e]">Active Filters:</span>
                  <button
                    onClick={handleResetFilters}
                    className="text-[10.5px] text-[#00d992] hover:text-[#2fd6a1] font-semibold cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#111111] border border-[#3d3a39] text-[#f2f2f2] font-mono text-[10.5px]">
                      <span>q: &quot;{searchQuery}&quot;</span>
                      <button onClick={() => setSearchQuery('')} className="hover:text-red-400">✕</button>
                    </span>
                  )}
                  {selectedAvailability !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#111111] border border-[#3d3a39] text-[#00d992] font-mono text-[10.5px]">
                      <span>avail: {selectedAvailability}</span>
                      <button onClick={() => setSelectedAvailability('all')} className="hover:text-red-400">✕</button>
                    </span>
                  )}
                  {expertSkills.map((sk) => (
                    <span key={sk} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#00d992]/10 border border-[#00d992]/30 text-[#00d992] font-mono text-[10.5px]">
                      <span>[Expert] {sk}</span>
                      <button onClick={() => handleRemoveSkillFromBucket('Expert', sk)} className="hover:text-red-400">✕</button>
                    </span>
                  ))}
                  {intermediateSkills.map((sk) => (
                    <span key={sk} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-sky-500/10 border border-sky-500/30 text-sky-400 font-mono text-[10.5px]">
                      <span>[Interm] {sk}</span>
                      <button onClick={() => handleRemoveSkillFromBucket('Intermediate', sk)} className="hover:text-red-400">✕</button>
                    </span>
                  ))}
                  {beginnerSkills.map((sk) => (
                    <span key={sk} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-amber-400/10 border border-amber-400/30 text-amber-400 font-mono text-[10.5px]">
                      <span>[Beginner] {sk}</span>
                      <button onClick={() => handleRemoveSkillFromBucket('Beginner', sk)} className="hover:text-red-400">✕</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right Column: All Interview Cards (8 cols on desktop) */}
        <main className="lg:col-span-8 xl:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono uppercase tracking-wider text-[#8b949e]">
              Showing {filteredCandidates.length} Interview {filteredCandidates.length === 1 ? 'Profile' : 'Profiles'}
            </span>
            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="text-xs font-semibold text-[#00d992] hover:text-[#2fd6a1] cursor-pointer"
              >
                Reset Filters ✕
              </button>
            )}
          </div>

          {filteredCandidates.length === 0 ? (
            <div className="p-12 rounded-[14px] bg-[#1a1a1a] border border-[#3d3a39] text-center space-y-3">
              <div className="text-3xl text-[#8b949e]">🔍</div>
              <h3 className="text-base font-semibold text-[#f2f2f2]">
                No candidate profiles matched your filter criteria
              </h3>
              <p className="text-xs text-[#8b949e] max-w-md mx-auto">
                Try adjusting your search query, choosing a different availability schedule, or removing skills from the proficiency buckets.
              </p>
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center justify-center font-semibold rounded-[6px] bg-[#00d992] text-[#101010] hover:bg-[#2fd6a1] transition-all text-xs px-4 py-2 cursor-pointer mt-2"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredCandidates.map((candidate) => {
                const candidateSkills =
                  candidate.skills ||
                  candidate.keySkills.map((sk) => ({
                    name: sk,
                    proficiency: 'Intermediate' as SkillProficiency
                  }));

                return (
                  <div
                    key={candidate.id}
                    className="rounded-[14px] bg-[#1a1a1a] border border-[#3d3a39] hover:border-[#00d992]/50 transition-all p-5 flex flex-col justify-between space-y-4 shadow-xs group"
                  >
                    <div className="space-y-3.5">
                      {/* Top Candidate Profile Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={candidate.avatar}
                              alt={candidate.name}
                              className="w-12 h-12 rounded-full border border-[#3d3a39] object-cover ring-2 ring-[#00d992]/20 flex-shrink-0"
                            />
                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#00d992] border-2 border-[#1a1a1a]" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base font-bold text-[#f2f2f2] tracking-tight truncate">
                              {candidate.name}
                            </h3>
                            <p className="text-xs text-[#8b949e] font-mono mt-0.5 truncate">
                              <span className="text-[#f2f2f2] font-semibold">{candidate.currentCompany}</span> • {candidate.yearsExperience} yrs exp
                            </p>
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#111111] border border-[#3d3a39] text-[11px] font-semibold text-[#00d992]">
                                Target: {candidate.targetRole}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#00d992]/15 text-[#00d992] border border-[#00d992]/50 flex-shrink-0 shadow-xs">
                          {candidate.compatibilityScore}% MATCH
                        </span>
                      </div>

                      {/* Headline Callout */}
                      {candidate.headline && (
                        <div>
                          <p className="text-xs font-semibold text-[#f2f2f2] line-clamp-2 leading-relaxed">
                            {candidate.headline}
                          </p>
                        </div>
                      )}

                      {/* Objective */}
                      <div className="p-2.5 rounded-[6px] bg-[#111111] border border-[#3d3a39] space-y-0.5">
                        <span className="text-[9.5px] font-mono uppercase text-[#8b949e] tracking-wider block">
                          Career Objective
                        </span>
                        <p className="text-[11.5px] text-[#bdbdbd] line-clamp-2 leading-relaxed">
                          &ldquo;{candidate.objective || candidate.careerGoals}&rdquo;
                        </p>
                      </div>

                      {/* Availability Badge */}
                      <div className="flex items-center gap-2 p-2 rounded-[6px] bg-[#151515] border border-[#3d3a39]/70 text-xs font-mono">
                        <span className="text-[#00d992] font-semibold">
                          ⏱
                        </span>
                        <span className="text-[#f2f2f2] truncate">
                          {candidate.availability || 'Weekdays 6:00 PM – 9:00 PM EST'}
                        </span>
                      </div>

                      {/* Skills with PROFICIENCY LEVEL badges */}
                      <div className="space-y-1.5 pt-1 border-t border-[#3d3a39]/70">
                        <span className="text-[10px] font-mono uppercase text-[#8b949e] tracking-wider block font-semibold">
                          Skills & Proficiency ({candidateSkills.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {candidateSkills.map((sk) => (
                            <div
                              key={sk.name}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#111111] border border-[#3d3a39]"
                            >
                              <span className="text-[11px] font-medium text-[#f2f2f2]">
                                {sk.name}
                              </span>
                              <span
                                className={`px-1 py-0.2 rounded-[3px] text-[9px] font-mono font-bold uppercase tracking-wider ${getProficiencyStyle(
                                  sk.proficiency
                                )}`}
                              >
                                {sk.proficiency}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Rubric Alignment Note */}
                      <div className="text-[11px] text-[#8b949e] flex items-start gap-1 pt-0.5 line-clamp-2">
                        <span className="text-[#00d992] font-mono font-semibold whitespace-nowrap">
                          Rubric:
                        </span>
                        <span className="text-[#bdbdbd] leading-relaxed">
                          {candidate.compatibilityReason}
                        </span>
                      </div>
                    </div>

                    {/* Card Footer: Preferred Format & Action Button */}
                    <div className="pt-3 border-t border-[#3d3a39]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-1 text-[11px] font-mono text-[#8b949e] truncate">
                        <span className="text-[#00d992]">Format:</span>
                        <span className="truncate">{candidate.preferredFormat}</span>
                      </div>

                      <button
                        onClick={() => setSelectedCandidate(candidate)}
                        className="inline-flex items-center justify-center font-semibold rounded-[6px] bg-[#00d992] text-[#101010] hover:bg-[#2fd6a1] transition-all text-xs px-3.5 py-1.5 cursor-pointer shadow-xs whitespace-nowrap"
                      >
                        Invite
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Modal: Invite Candidate */}
      {selectedCandidate && (
        <InviteCandidateModal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
        />
      )}
    </div>
  );
}
