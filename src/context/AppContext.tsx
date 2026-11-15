'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserAccount,
  UserRole,
  CandidateProfile,
  InterviewerProfile,
  InterviewSession,
  MatchingInterviewer,
  MatchingCandidate,
  InterviewQuestionnaire
} from '@/types';
import {
  INITIAL_USER_ACCOUNT,
  MATCHING_INTERVIEWERS,
  MATCHING_CANDIDATES,
  INITIAL_SESSIONS
} from '@/lib/mockData';

interface ToastInfo {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'warning';
}

interface AppContextType {
  currentUser: UserAccount;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  updateCandidateProfile: (profile: Partial<CandidateProfile>) => void;
  updateUserProfile: (profile: Partial<InterviewerProfile>, silent?: boolean) => void;
  updateInterviewerProfile: (profile: Partial<InterviewerProfile>, silent?: boolean) => void;
  sessions: InterviewSession[];
  requestInterview: (
    targetId: string,
    targetName: string,
    targetAvatar: string,
    targetCompanyOrRole: string,
    format: string,
    date: string,
    notes: string
  ) => void;
  updateSessionStatus: (sessionId: string, status: InterviewSession['status']) => void;
  submitQuestionnaire: (sessionId: string, questionnaire: InterviewQuestionnaire) => void;
  matchingInterviewers: MatchingInterviewer[];
  matchingCandidates: MatchingCandidate[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  toasts: ToastInfo[];
  showToast: (message: string, type?: ToastInfo['type']) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_USER = 'sutradhar_user_account_v3';
const STORAGE_KEY_SESSIONS = 'sutradhar_sessions_v3';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserAccount>(INITIAL_USER_ACCOUNT);
  const [sessions, setSessions] = useState<InterviewSession[]>(INITIAL_SESSIONS);
  const [matchingInterviewers] = useState<MatchingInterviewer[]>(MATCHING_INTERVIEWERS);
  const [matchingCandidates] = useState<MatchingCandidate[]>(MATCHING_CANDIDATES);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [toasts, setToasts] = useState<ToastInfo[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize from localStorage safely on client
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEY_USER);
      const storedSessions = localStorage.getItem(STORAGE_KEY_SESSIONS);
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const storedIP = parsed.interviewerProfile || {};
        
        // Defensive sanitization: ensure no {} objects corrupt string or array fields
        const safeTargetRoles = Array.isArray(storedIP.targetRoles)
          ? storedIP.targetRoles.filter((r: unknown): r is string => typeof r === 'string' && r.trim().length > 0)
          : INITIAL_USER_ACCOUNT.interviewerProfile.targetRoles;

        const safeSkills = Array.isArray(storedIP.skills)
          ? storedIP.skills.filter((s: unknown): s is InterviewerProfile['skills'][0] => s !== null && typeof s === 'object' && typeof (s as { name?: unknown }).name === 'string')
          : INITIAL_USER_ACCOUNT.interviewerProfile.skills;

        const safeJobDescriptions = Array.isArray(storedIP.jobDescriptions)
          ? storedIP.jobDescriptions.filter((jd: unknown): jd is InterviewerProfile['jobDescriptions'] extends (infer U)[] ? U : never => jd !== null && typeof jd === 'object' && typeof (jd as { roleTitle?: unknown }).roleTitle === 'string')
          : INITIAL_USER_ACCOUNT.interviewerProfile.jobDescriptions;

        setCurrentUser({
          ...INITIAL_USER_ACCOUNT,
          ...parsed,
          interviewerProfile: {
            ...INITIAL_USER_ACCOUNT.interviewerProfile,
            ...storedIP,
            headline: typeof storedIP.headline === 'string' ? storedIP.headline : INITIAL_USER_ACCOUNT.interviewerProfile.headline,
            objectives: typeof storedIP.objectives === 'string' ? storedIP.objectives : INITIAL_USER_ACCOUNT.interviewerProfile.objectives,
            targetRoles: safeTargetRoles.length > 0 ? safeTargetRoles : INITIAL_USER_ACCOUNT.interviewerProfile.targetRoles,
            timezone: typeof storedIP.timezone === 'string' ? storedIP.timezone : INITIAL_USER_ACCOUNT.interviewerProfile.timezone,
            weeklyAvailability: typeof storedIP.weeklyAvailability === 'string' ? storedIP.weeklyAvailability : INITIAL_USER_ACCOUNT.interviewerProfile.weeklyAvailability,
            skills: safeSkills,
            jobDescriptions: safeJobDescriptions,
            context: {
              ...INITIAL_USER_ACCOUNT.interviewerProfile.context,
              ...(storedIP.context || {})
            },
            experience: {
              ...INITIAL_USER_ACCOUNT.interviewerProfile.experience,
              ...(storedIP.experience || {})
            }
          }
        });
      }
      if (storedSessions) {
        const parsedSessions = JSON.parse(storedSessions);
        setSessions(parsedSessions);
      }
    } catch (e) {
      console.warn('Failed to parse state from localStorage', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage whenever user changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser));
      } catch (e) {
        console.warn('Failed to save user account to localStorage', e);
      }
    }
  }, [currentUser, isLoaded]);

  // Save sessions to localStorage
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
      } catch (e) {
        console.warn('Failed to save sessions to localStorage', e);
      }
    }
  }, [sessions, isLoaded]);

  const showToast = (message: string, type: ToastInfo['type'] = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const setActiveRole = (role: UserRole) => {
    setCurrentUser((prev) => ({
      ...prev,
      activeRole: 'interviewer'
    }));
  };

  const updateCandidateProfile = (updatedFields: Partial<CandidateProfile>) => {
    setCurrentUser((prev) => ({
      ...prev,
      candidateProfile: {
        ...prev.candidateProfile,
        ...updatedFields
      }
    }));
    showToast('Candidate profile updated successfully', 'success');
  };

  const updateUserProfile = (updatedFields: Partial<InterviewerProfile>, silent = false) => {
    // Sanitize incoming fields to never allow empty {} objects to overwrite string / array fields
    const sanitized: Partial<InterviewerProfile> = {};
    if (typeof updatedFields.headline === 'string') sanitized.headline = updatedFields.headline;
    if (typeof updatedFields.objectives === 'string') sanitized.objectives = updatedFields.objectives;
    if (Array.isArray(updatedFields.targetRoles)) {
      sanitized.targetRoles = updatedFields.targetRoles.filter((r): r is string => typeof r === 'string' && r.trim().length > 0);
    }
    if (typeof updatedFields.timezone === 'string') sanitized.timezone = updatedFields.timezone;
    if (typeof updatedFields.weeklyAvailability === 'string') sanitized.weeklyAvailability = updatedFields.weeklyAvailability;
    if (Array.isArray(updatedFields.skills)) sanitized.skills = updatedFields.skills;
    if (Array.isArray(updatedFields.jobDescriptions)) sanitized.jobDescriptions = updatedFields.jobDescriptions;
    if (updatedFields.context && typeof updatedFields.context === 'object') sanitized.context = updatedFields.context;
    if (updatedFields.experience && typeof updatedFields.experience === 'object') sanitized.experience = updatedFields.experience;

    setCurrentUser((prev) => ({
      ...prev,
      interviewerProfile: {
        ...prev.interviewerProfile,
        ...sanitized
      }
    }));
    if (!silent) {
      showToast('User profile updated successfully', 'success');
    }
  };

  const updateInterviewerProfile = updateUserProfile;

  const requestInterview = (
    targetId: string,
    targetName: string,
    targetAvatar: string,
    targetCompanyOrRole: string,
    format: string,
    date: string,
    notes: string
  ) => {
    const newSession: InterviewSession = {
      id: `ses_${Date.now()}`,
      candidateId: targetId,
      candidateName: targetName,
      candidateAvatar: targetAvatar,
      candidateRole: targetCompanyOrRole,
      interviewerId: currentUser.id,
      interviewerName: currentUser.name,
      interviewerAvatar: currentUser.avatar,
      interviewerCompany: currentUser.interviewerProfile.experience.primaryCompany,
      format,
      scheduledAt: date,
      status: 'pending',
      originatorRole: 'interviewer',
      interviewerNotes: notes
    };

    setSessions((prev) => [newSession, ...prev]);
    showToast(`Invitation sent to candidate ${targetName}`, 'success');
  };

  const updateSessionStatus = (sessionId: string, status: InterviewSession['status']) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        const updated = { ...s, status };
        if (status === 'accepted' && !updated.meetingUrl) {
          updated.meetingUrl = `https://meet.sutradhar.dev/room/mock-${sessionId.substring(4)}`;
        }
        return updated;
      })
    );
    showToast(`Session status updated to "${status.toUpperCase()}"`, 'info');
  };

  const submitQuestionnaire = (sessionId: string, questionnaire: InterviewQuestionnaire) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          status: 'completed',
          questionnaire
        };
      })
    );
    showToast('Post-interview questionnaire submitted successfully', 'success');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        activeRole: currentUser.activeRole,
        setActiveRole,
        updateCandidateProfile,
        updateUserProfile,
        updateInterviewerProfile,
        sessions,
        requestInterview,
        updateSessionStatus,
        submitQuestionnaire,
        matchingInterviewers,
        matchingCandidates,
        activeTab,
        setActiveTab,
        toasts,
        showToast,
        removeToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
