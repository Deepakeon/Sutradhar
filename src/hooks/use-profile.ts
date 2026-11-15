'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '@/context/AppContext';
import { InterviewerProfile, JobDescription, JDSkillItem, InterviewerSkillItem } from '@/types';

export function useProfile() {
  const { currentUser, updateUserProfile, showToast } = useApp();
  const profile = currentUser.interviewerProfile;

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Initialize Supabase browser client
  const supabase = useMemo(() => createClient(), []);

  // --------------------------------------------------------------------------
  // 1. READ: Fetch Profile from Supabase on Mount
  // --------------------------------------------------------------------------
  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        // Unauthenticated or local fallback
        return;
      }

      const currentUid = authData.user.id;
      setUserId(currentUid);

      // Attempt RPC function first (ADR-0001 pattern)
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_my_profile');

      if (!rpcError && rpcData) {
        const fetchedProfile = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
        if (fetchedProfile && typeof fetchedProfile === 'object') {
          const updates: Partial<InterviewerProfile> = {};

          if (typeof fetchedProfile.headline === 'string' && fetchedProfile.headline.trim()) {
            updates.headline = fetchedProfile.headline.trim();
          }
          if (typeof fetchedProfile.objective === 'string' && fetchedProfile.objective.trim()) {
            updates.objectives = fetchedProfile.objective.trim();
          }
          if (typeof fetchedProfile.roles_free_text === 'string' && fetchedProfile.roles_free_text.trim()) {
            const parsedRoles = fetchedProfile.roles_free_text
              .split(/[\n,;]/)
              .map((r: string) => r.trim())
              .filter(Boolean);
            if (parsedRoles.length > 0) {
              updates.targetRoles = parsedRoles;
            }
          }
          if (typeof fetchedProfile.availability_schedule === 'string' && fetchedProfile.availability_schedule.trim()) {
            updates.weeklyAvailability = fetchedProfile.availability_schedule.trim();
          }
          if (typeof fetchedProfile.timezone === 'string' && fetchedProfile.timezone.trim()) {
            updates.timezone = fetchedProfile.timezone.trim();
          }

          // Only update if remote profile returned actual profile attributes
          if (Object.keys(updates).length > 0) {
            updateUserProfile(updates, true);
          }
          setIsSynced(true);
        }
        return;
      }

      // Direct fallback to private.profiles table
      const { data: tableData, error: tableError } = await supabase
        .schema('private')
        .from('profiles')
        .select('*')
        .eq('id', currentUid)
        .single();

      if (!tableError && tableData) {
        const row = tableData as Record<string, unknown>;
        const updates: Partial<InterviewerProfile> = {};
        if (typeof row.headline === 'string' && row.headline.trim()) {
          updates.headline = row.headline.trim();
        }
        if (typeof row.objective === 'string' && row.objective.trim()) {
          updates.objectives = row.objective.trim();
        }
        if (Object.keys(updates).length > 0) {
          updateUserProfile(updates, true);
        }
        setIsSynced(true);
      }
    } catch (err) {
      console.warn('Supabase profile fetch handled with local fallback:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, updateUserProfile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // --------------------------------------------------------------------------
  // 2. UPDATE: Update Profile Context, Bio & Availability in Supabase
  // --------------------------------------------------------------------------
  const updateProfileData = useCallback(
    async (updates: Partial<InterviewerProfile>) => {
      try {
        setIsSaving(true);

        // Update local context state first for instant UI response
        updateUserProfile(updates);

        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          const uid = authData.user.id;
          const payload: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
          };

          if (updates.headline !== undefined) payload.headline = updates.headline;
          if (updates.objectives !== undefined) payload.objective = updates.objectives;
          if (updates.targetRoles !== undefined) {
            payload.roles_free_text = Array.isArray(updates.targetRoles) ? updates.targetRoles.join(', ') : updates.targetRoles;
          }
          if (updates.weeklyAvailability !== undefined) payload.availability_schedule = updates.weeklyAvailability;
          if (updates.timezone !== undefined) payload.timezone = updates.timezone;

          // Attempt update to private.profiles
          const { error } = await supabase
            .schema('private')
            .from('profiles')
            .update(payload)
            .eq('id', uid);

          if (!error) {
            setIsSynced(true);
          }
        }
      } catch (err) {
        console.warn('Supabase profile update recorded locally:', err);
      } finally {
        setIsSaving(false);
      }
    },
    [supabase, updateUserProfile]
  );

  // --------------------------------------------------------------------------
  // 3. CREATE & DELETE: Job Descriptions (JDs)
  // --------------------------------------------------------------------------
  const createJobDescription = useCallback(
    async (newJD: JobDescription) => {
      try {
        setIsSaving(true);
        const currentJDs = profile.jobDescriptions || [];
        const updated = [newJD, ...currentJDs];

        updateUserProfile({ jobDescriptions: updated });

        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          await supabase
            .schema('private')
            .from('job_descriptions')
            .insert({
              id: newJD.id,
              profile_id: authData.user.id,
              role_title: newJD.roleTitle,
              note: newJD.note,
              timing_available: newJD.timingAvailable,
              created_at: new Date().toISOString(),
            });
        }
        showToast('Job Description created successfully', 'success');
      } catch (err) {
        console.warn('Job description saved to local profile:', err);
        showToast('Job Description created', 'success');
      } finally {
        setIsSaving(false);
      }
    },
    [profile.jobDescriptions, showToast, supabase, updateUserProfile]
  );

  const deleteJobDescription = useCallback(
    async (jdId: string) => {
      try {
        setIsSaving(true);
        const currentJDs = profile.jobDescriptions || [];
        updateUserProfile({
          jobDescriptions: currentJDs.filter((j) => j.id !== jdId),
        });

        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          await supabase
            .schema('private')
            .from('job_descriptions')
            .delete()
            .eq('id', jdId)
            .eq('profile_id', authData.user.id);
        }
        showToast('Job Description removed', 'info');
      } catch (err) {
        console.warn('Job description removed locally:', err);
        showToast('Job Description removed', 'info');
      } finally {
        setIsSaving(false);
      }
    },
    [profile.jobDescriptions, showToast, supabase, updateUserProfile]
  );

  // --------------------------------------------------------------------------
  // 4. DELETE: Skills
  // --------------------------------------------------------------------------
  const deleteSkill = useCallback(
    async (skillId: string) => {
      try {
        const remaining = profile.skills.filter((s) => s.id !== skillId);
        updateUserProfile({ skills: remaining });

        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          await supabase
            .schema('private')
            .from('profile_skills')
            .delete()
            .eq('id', skillId)
            .eq('profile_id', authData.user.id);
        }
        showToast('Skill removed from profile', 'info');
      } catch (err) {
        console.warn('Skill removed locally:', err);
        showToast('Skill removed from profile', 'info');
      }
    },
    [profile.skills, showToast, supabase, updateUserProfile]
  );

  return {
    profile,
    currentUser,
    userId,
    isLoading,
    isSaving,
    isSynced,
    fetchProfile,
    updateProfileData,
    createJobDescription,
    deleteJobDescription,
    deleteSkill,
  };
}
