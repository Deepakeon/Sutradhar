-- ==============================================================================
-- Migration: 20261023182504_schema_spec_profiles_skills_interviews.sql
-- Description: Implement full spec for Profile, ProfileSkill, and Interview tables
--              in private schema with user-based RLS.
-- ==============================================================================

-- 1. Ensure private schema usage
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, anon, service_role;

-- 2. Define Enums
CREATE TYPE private.skill_proficiency AS ENUM ('beginner', 'intermediate', 'expert');
CREATE TYPE private.interview_status AS ENUM (
  'pending',
  'accepted',
  'declined',
  'revoked',
  'completed',
  'cancelled'
);

-- 3. Extend private.profiles
ALTER TABLE private.profiles
  ADD COLUMN headline TEXT,
  ADD COLUMN objective TEXT,
  ADD COLUMN roles_free_text TEXT,
  ADD COLUMN availability_schedule JSONB DEFAULT '{}'::jsonb;

-- 4. ProfileSkill Table in private schema
CREATE TABLE private.profile_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES private.profiles(id) ON DELETE CASCADE,
  skill_ids UUID[] NOT NULL DEFAULT '{}',
  proficiency private.skill_proficiency NOT NULL DEFAULT 'intermediate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profile_skills_profile_id ON private.profile_skills(profile_id);
CREATE INDEX idx_profile_skills_skill_ids ON private.profile_skills USING GIN (skill_ids);

-- 5. Extend and update private.interviews
ALTER TABLE private.interviews
  DROP CONSTRAINT interviews_candidate_id_fkey,
  DROP CONSTRAINT interviews_interviewer_id_fkey,
  DROP CONSTRAINT interviews_status_check,
  ADD CONSTRAINT interviews_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES private.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT interviews_interviewer_id_fkey FOREIGN KEY (interviewer_id) REFERENCES private.profiles(id) ON DELETE CASCADE,
  ADD COLUMN compatibility_score NUMERIC(5, 2),
  ADD COLUMN notes TEXT,
  ADD COLUMN meeting_url TEXT,
  ADD COLUMN transcript TEXT,
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE private.interview_status USING status::private.interview_status,
  ALTER COLUMN status SET DEFAULT 'pending';

CREATE INDEX idx_interviews_interviewer_id ON private.interviews(interviewer_id);
CREATE INDEX idx_interviews_candidate_id ON private.interviews(candidate_id);
CREATE INDEX idx_interviews_status ON private.interviews(status);

-- 6. Row Level Security (RLS)

-- 6.1 Profiles RLS
ALTER TABLE private.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_policy" ON private.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_insert_policy" ON private.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_policy" ON private.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_policy" ON private.profiles
  FOR DELETE TO authenticated USING (auth.uid() = id);

-- 6.2 Profile Skills RLS
ALTER TABLE private.profile_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_skills_select_policy" ON private.profile_skills
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profile_skills_insert_policy" ON private.profile_skills
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "profile_skills_update_policy" ON private.profile_skills
  FOR UPDATE TO authenticated USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "profile_skills_delete_policy" ON private.profile_skills
  FOR DELETE TO authenticated USING (auth.uid() = profile_id);

-- 6.3 Interviews RLS (replace policies to align with full CRUD permissions)
DROP POLICY IF EXISTS "interviews_select_policy" ON private.interviews;
CREATE POLICY "interviews_select_policy" ON private.interviews
  FOR SELECT TO authenticated USING (auth.uid() = candidate_id OR auth.uid() = interviewer_id);

DROP POLICY IF EXISTS "interviews_insert_policy" ON private.interviews;
CREATE POLICY "interviews_insert_policy" ON private.interviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = candidate_id OR auth.uid() = interviewer_id);

DROP POLICY IF EXISTS "interviews_update_policy" ON private.interviews;
CREATE POLICY "interviews_update_policy" ON private.interviews
  FOR UPDATE TO authenticated USING (auth.uid() = candidate_id OR auth.uid() = interviewer_id) WITH CHECK (auth.uid() = candidate_id OR auth.uid() = interviewer_id);

DROP POLICY IF EXISTS "interviews_delete_policy" ON private.interviews;
CREATE POLICY "interviews_delete_policy" ON private.interviews
  FOR DELETE TO authenticated USING (auth.uid() = candidate_id OR auth.uid() = interviewer_id);

-- 7. Table Grants
GRANT ALL ON TABLE private.profiles TO authenticated, service_role;
GRANT ALL ON TABLE private.profile_skills TO authenticated, service_role;
GRANT ALL ON TABLE private.interviews TO authenticated, service_role;
