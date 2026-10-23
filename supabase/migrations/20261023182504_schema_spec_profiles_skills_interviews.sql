-- ==============================================================================
-- Migration: 20261023182504_schema_spec_profiles_skills_interviews.sql
-- Description: Implement full spec for Profile, ProfileSkill, and Interview tables
--              in private schema with user-based RLS and RPC methods.
-- ==============================================================================

-- 1. Ensure private schema exists
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, anon, service_role;

-- 2. Define Enums
DO $$ BEGIN
  CREATE TYPE private.skill_proficiency AS ENUM ('beginner', 'intermediate', 'expert');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE private.interview_status AS ENUM (
    'pending',
    'accepted',
    'declined',
    'revoked',
    'completed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Profiles Table in private schema
CREATE TABLE IF NOT EXISTS private.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  headline TEXT,
  objective TEXT,
  roles_free_text TEXT,
  availability_schedule JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backfill / ensure columns exist if private.profiles was partially created earlier
ALTER TABLE private.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS objective TEXT,
  ADD COLUMN IF NOT EXISTS roles_free_text TEXT,
  ADD COLUMN IF NOT EXISTS availability_schedule JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Ensure all current auth.users have a profile record
INSERT INTO private.profiles (id, email, full_name, avatar_url, updated_at)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name'),
  COALESCE(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture'),
  now()
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET
  email = COALESCE(EXCLUDED.email, private.profiles.email),
  full_name = COALESCE(EXCLUDED.full_name, private.profiles.full_name),
  avatar_url = COALESCE(EXCLUDED.avatar_url, private.profiles.avatar_url);

-- 4. ProfileSkill Table in private schema
CREATE TABLE IF NOT EXISTS private.profile_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES private.profiles(id) ON DELETE CASCADE,
  skill_ids UUID[] NOT NULL DEFAULT '{}',
  proficiency private.skill_proficiency NOT NULL DEFAULT 'intermediate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_skills_profile_id ON private.profile_skills(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_skills_skill_ids ON private.profile_skills USING GIN (skill_ids);

-- 5. Interviews Table in private schema
CREATE TABLE IF NOT EXISTS private.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interviewer_id UUID NOT NULL REFERENCES private.profiles(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES private.profiles(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status private.interview_status NOT NULL DEFAULT 'pending',
  compatibility_score NUMERIC(5, 2),
  notes TEXT,
  meeting_url TEXT,
  transcript TEXT,
  title TEXT NOT NULL DEFAULT 'Technical Interview',
  format TEXT NOT NULL DEFAULT '45m Technical Assessment',
  master_recording_url TEXT,
  total_chunks INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Handle column alterations if table was already created
ALTER TABLE private.interviews
  ADD COLUMN IF NOT EXISTS interviewer_id UUID REFERENCES private.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES private.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS compatibility_score NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS meeting_url TEXT,
  ADD COLUMN IF NOT EXISTS transcript TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Technical Interview',
  ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT '45m Technical Assessment',
  ADD COLUMN IF NOT EXISTS master_recording_url TEXT,
  ADD COLUMN IF NOT EXISTS total_chunks INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Ensure foreign keys point to private.profiles(id)
ALTER TABLE private.interviews
  DROP CONSTRAINT IF EXISTS interviews_candidate_id_fkey,
  DROP CONSTRAINT IF EXISTS interviews_interviewer_id_fkey;

ALTER TABLE private.interviews
  ADD CONSTRAINT interviews_candidate_id_fkey
    FOREIGN KEY (candidate_id) REFERENCES private.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT interviews_interviewer_id_fkey
    FOREIGN KEY (interviewer_id) REFERENCES private.profiles(id) ON DELETE CASCADE;

-- Convert existing text status column to enum if necessary
DO $$
BEGIN
  -- If status column is not already private.interview_status
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'private'
      AND table_name = 'interviews'
      AND column_name = 'status'
      AND udt_name != 'interview_status'
  ) THEN
    -- Drop old check constraint if exists
    ALTER TABLE private.interviews DROP CONSTRAINT IF EXISTS interviews_status_check;

    ALTER TABLE private.interviews
      ALTER COLUMN status DROP DEFAULT,
      ALTER COLUMN status TYPE private.interview_status
        USING (
          CASE
            WHEN status = 'in_progress' THEN 'accepted'::private.interview_status
            WHEN status IN ('pending', 'accepted', 'declined', 'revoked', 'completed', 'cancelled')
              THEN status::private.interview_status
            ELSE 'pending'::private.interview_status
          END
        ),
      ALTER COLUMN status SET DEFAULT 'pending'::private.interview_status;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_interviews_interviewer_id ON private.interviews(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate_id ON private.interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON private.interviews(status);

-- 6. Row Level Security (RLS)

-- A. private.profiles RLS
ALTER TABLE private.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_policy" ON private.profiles;
CREATE POLICY "profiles_select_policy" ON private.profiles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_insert_policy" ON private.profiles;
CREATE POLICY "profiles_insert_policy" ON private.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_policy" ON private.profiles;
CREATE POLICY "profiles_update_policy" ON private.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_policy" ON private.profiles;
CREATE POLICY "profiles_delete_policy" ON private.profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- B. private.profile_skills RLS
ALTER TABLE private.profile_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_skills_select_policy" ON private.profile_skills;
CREATE POLICY "profile_skills_select_policy" ON private.profile_skills
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profile_skills_insert_policy" ON private.profile_skills;
CREATE POLICY "profile_skills_insert_policy" ON private.profile_skills
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "profile_skills_update_policy" ON private.profile_skills;
CREATE POLICY "profile_skills_update_policy" ON private.profile_skills
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "profile_skills_delete_policy" ON private.profile_skills;
CREATE POLICY "profile_skills_delete_policy" ON private.profile_skills
  FOR DELETE
  TO authenticated
  USING (auth.uid() = profile_id);

-- C. private.interviews RLS
ALTER TABLE private.interviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interviews_select_policy" ON private.interviews;
CREATE POLICY "interviews_select_policy" ON private.interviews
  FOR SELECT
  TO authenticated
  USING (auth.uid() = candidate_id OR auth.uid() = interviewer_id);

DROP POLICY IF EXISTS "interviews_insert_policy" ON private.interviews;
CREATE POLICY "interviews_insert_policy" ON private.interviews
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = candidate_id OR auth.uid() = interviewer_id);

DROP POLICY IF EXISTS "interviews_update_policy" ON private.interviews;
CREATE POLICY "interviews_update_policy" ON private.interviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = candidate_id OR auth.uid() = interviewer_id)
  WITH CHECK (auth.uid() = candidate_id OR auth.uid() = interviewer_id);

DROP POLICY IF EXISTS "interviews_delete_policy" ON private.interviews;
CREATE POLICY "interviews_delete_policy" ON private.interviews
  FOR DELETE
  TO authenticated
  USING (auth.uid() = candidate_id OR auth.uid() = interviewer_id);

-- 7. Grant Permissions
GRANT ALL ON TABLE private.profiles TO authenticated, service_role;
GRANT ALL ON TABLE private.profile_skills TO authenticated, service_role;
GRANT ALL ON TABLE private.interviews TO authenticated, service_role;

-- 8. Stored Procedures / Methods from Spec

-- 8.1 Profile.getProfile()
CREATE OR REPLACE FUNCTION public.get_profile(target_profile_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, auth
AS $$
DECLARE
  _result JSONB;
BEGIN
  IF target_profile_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', p.id,
    'email', p.email,
    'full_name', p.full_name,
    'avatar_url', p.avatar_url,
    'headline', p.headline,
    'objective', p.objective,
    'roles_free_text', p.roles_free_text,
    'availability_schedule', p.availability_schedule,
    'created_at', p.created_at,
    'updated_at', p.updated_at,
    'skills', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', ps.id,
            'profile_id', ps.profile_id,
            'skill_ids', ps.skill_ids,
            'proficiency', ps.proficiency,
            'created_at', ps.created_at,
            'updated_at', ps.updated_at
          )
        )
        FROM private.profile_skills ps
        WHERE ps.profile_id = p.id
      ),
      '[]'::jsonb
    )
  ) INTO _result
  FROM private.profiles p
  WHERE p.id = target_profile_id;

  RETURN _result;
END;
$$;

-- Maintain backward compatibility for get_my_profile()
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, auth
AS $$
BEGIN
  RETURN public.get_profile(auth.uid());
END;
$$;

-- 8.2 Profile.updateProfile(headline, objective, roles, availability, skills)
CREATE OR REPLACE FUNCTION public.update_profile(
  headline TEXT DEFAULT NULL,
  objective TEXT DEFAULT NULL,
  roles TEXT DEFAULT NULL,
  availability JSONB DEFAULT NULL,
  skills JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, auth
AS $$
DECLARE
  _uid UUID := auth.uid();
  _skill JSONB;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure profile row exists
  INSERT INTO private.profiles (id, updated_at)
  VALUES (_uid, now())
  ON CONFLICT (id) DO NOTHING;

  -- Update profile scalar attributes
  UPDATE private.profiles
  SET
    headline = COALESCE(update_profile.headline, private.profiles.headline),
    objective = COALESCE(update_profile.objective, private.profiles.objective),
    roles_free_text = COALESCE(update_profile.roles, private.profiles.roles_free_text),
    availability_schedule = COALESCE(update_profile.availability, private.profiles.availability_schedule),
    updated_at = now()
  WHERE id = _uid;

  -- If skills JSON array provided, sync profile_skills
  IF skills IS NOT NULL AND jsonb_typeof(skills) = 'array' THEN
    DELETE FROM private.profile_skills WHERE profile_id = _uid;

    FOR _skill IN SELECT * FROM jsonb_array_elements(skills)
    LOOP
      INSERT INTO private.profile_skills (
        profile_id,
        skill_ids,
        proficiency,
        updated_at
      )
      VALUES (
        _uid,
        ARRAY(
          SELECT jsonb_array_elements_text(COALESCE(_skill->'skill_ids', '[]'::jsonb))::UUID
        ),
        COALESCE((_skill->>'proficiency')::private.skill_proficiency, 'intermediate'::private.skill_proficiency),
        now()
      );
    END LOOP;
  END IF;

  RETURN public.get_profile(_uid);
END;
$$;

-- 8.3 Interview.create()
CREATE OR REPLACE FUNCTION public.create_interview(
  interviewer_id UUID,
  candidate_id UUID,
  scheduled_at TIMESTAMPTZ DEFAULT now(),
  compatibility_score NUMERIC DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  meeting_url TEXT DEFAULT NULL,
  transcript TEXT DEFAULT NULL,
  title TEXT DEFAULT 'Technical Interview',
  format TEXT DEFAULT '45m Technical Assessment'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, auth
AS $$
DECLARE
  _uid UUID := auth.uid();
  _new_id UUID := gen_random_uuid();
  _url TEXT;
  _row JSONB;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _uid != candidate_id AND _uid != interviewer_id THEN
    RAISE EXCEPTION 'User must be either candidate or interviewer';
  END IF;

  _url := COALESCE(meeting_url, '/room/' || _new_id::text);

  INSERT INTO private.interviews (
    id,
    candidate_id,
    interviewer_id,
    scheduled_at,
    status,
    compatibility_score,
    notes,
    meeting_url,
    transcript,
    title,
    format,
    created_at,
    updated_at
  )
  VALUES (
    _new_id,
    candidate_id,
    interviewer_id,
    COALESCE(scheduled_at, now()),
    'pending'::private.interview_status,
    compatibility_score,
    notes,
    _url,
    transcript,
    title,
    format,
    now(),
    now()
  );

  SELECT to_jsonb(i) INTO _row
  FROM private.interviews i
  WHERE i.id = _new_id;

  RETURN _row;
END;
$$;

-- 8.4 Interview.updateStatus(status, notes)
CREATE OR REPLACE FUNCTION public.update_interview_status(
  interview_id UUID,
  status TEXT,
  notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, auth
AS $$
DECLARE
  _uid UUID := auth.uid();
  _status_enum private.interview_status;
  _row JSONB;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM private.interviews
    WHERE id = interview_id
      AND (candidate_id = _uid OR interviewer_id = _uid)
  ) THEN
    RAISE EXCEPTION 'Unauthorized: user is not a participant in this interview';
  END IF;

  _status_enum := status::private.interview_status;

  UPDATE private.interviews
  SET
    status = _status_enum,
    notes = COALESCE(update_interview_status.notes, private.interviews.notes),
    updated_at = now()
  WHERE id = interview_id;

  SELECT to_jsonb(i) INTO _row
  FROM private.interviews i
  WHERE i.id = interview_id;

  RETURN _row;
END;
$$;

-- Alias for updateStatus
CREATE OR REPLACE FUNCTION public.update_status(
  interview_id UUID,
  status TEXT,
  notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, auth
AS $$
BEGIN
  RETURN public.update_interview_status(interview_id, status, notes);
END;
$$;

-- 8.5 Interview.launchMeetingRoom()
CREATE OR REPLACE FUNCTION public.launch_meeting_room(interview_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, auth
AS $$
DECLARE
  _uid UUID := auth.uid();
  _url TEXT;
  _row JSONB;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM private.interviews
    WHERE id = interview_id
      AND (candidate_id = _uid OR interviewer_id = _uid)
  ) THEN
    RAISE EXCEPTION 'Unauthorized: user is not a participant in this interview';
  END IF;

  _url := '/room/' || interview_id::text;

  UPDATE private.interviews
  SET
    meeting_url = COALESCE(private.interviews.meeting_url, _url),
    updated_at = now()
  WHERE id = interview_id;

  SELECT to_jsonb(i) INTO _row
  FROM private.interviews i
  WHERE i.id = interview_id;

  RETURN _row;
END;
$$;

-- 9. Grant Execution on Public Functions
GRANT EXECUTE ON FUNCTION public.get_profile(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_profile(TEXT, TEXT, TEXT, JSONB, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_interview(UUID, UUID, TIMESTAMPTZ, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_interview_status(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_status(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.launch_meeting_room(UUID) TO authenticated, service_role;
