-- ==============================================================================
-- Migration: 20261023183953_add_skills_table_and_update_profile_skills.sql
-- Description: 
--   1. Seed / create skill_proficiency lookup table (beginner, intermediate, expert)
--   2. Create private.skills table (id PK, name string) with RLS
--   3. Update private.profile_skills: replace skill_ids array with skill_id foreign key
--   4. Update get_profile and update_profile functions to use normalized skills
-- ==============================================================================

-- 1. Ensure private schema
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, anon, service_role;

-- 2. Create private.skills table
CREATE TABLE IF NOT EXISTS private.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skills_name ON private.skills(name);

ALTER TABLE private.skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "skills_select_policy" ON private.skills;
CREATE POLICY "skills_select_policy" ON private.skills
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "skills_insert_policy" ON private.skills;
CREATE POLICY "skills_insert_policy" ON private.skills
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "skills_update_policy" ON private.skills;
CREATE POLICY "skills_update_policy" ON private.skills
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON TABLE private.skills TO authenticated, anon, service_role;

-- 3. Transition skill_proficiency to a seeded reference table
DO $$
BEGIN
  -- If private.skill_proficiency exists as an enum type, convert dependent columns and drop enum
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'private' AND t.typname = 'skill_proficiency' AND t.typtype = 'e'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'private' AND table_name = 'profile_skills' AND column_name = 'proficiency'
    ) THEN
      ALTER TABLE private.profile_skills ALTER COLUMN proficiency DROP DEFAULT;
      ALTER TABLE private.profile_skills ALTER COLUMN proficiency TYPE TEXT USING proficiency::TEXT;
    END IF;

    DROP TYPE private.skill_proficiency CASCADE;
  END IF;
END $$;

-- Create skill_proficiency table
CREATE TABLE IF NOT EXISTS private.skill_proficiency (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE private.skill_proficiency ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "skill_proficiency_select_policy" ON private.skill_proficiency;
CREATE POLICY "skill_proficiency_select_policy" ON private.skill_proficiency
  FOR SELECT TO authenticated, anon USING (true);

GRANT ALL ON TABLE private.skill_proficiency TO authenticated, anon, service_role;

-- Seed skill_proficiency values
INSERT INTO private.skill_proficiency (id, name)
VALUES
  ('beginner', 'Beginner'),
  ('intermediate', 'Intermediate'),
  ('expert', 'Expert')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 4. Update private.profile_skills table
DO $$
BEGIN
  -- Truncate existing profile_skills to avoid null foreign key violations
  TRUNCATE TABLE private.profile_skills;

  -- Drop GIN index if present
  DROP INDEX IF EXISTS private.idx_profile_skills_skill_ids;

  -- Drop skill_ids column if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'private'
      AND table_name = 'profile_skills'
      AND column_name = 'skill_ids'
  ) THEN
    ALTER TABLE private.profile_skills DROP COLUMN skill_ids;
  END IF;

  -- Add skill_id column referencing private.skills(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'private'
      AND table_name = 'profile_skills'
      AND column_name = 'skill_id'
  ) THEN
    ALTER TABLE private.profile_skills
      ADD COLUMN skill_id UUID NOT NULL REFERENCES private.skills(id) ON DELETE CASCADE;
  END IF;

  -- Add unique constraint on (profile_id, skill_id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profile_skills_profile_skill_unique'
  ) THEN
    ALTER TABLE private.profile_skills
      ADD CONSTRAINT profile_skills_profile_skill_unique UNIQUE (profile_id, skill_id);
  END IF;
END $$;

-- Update proficiency column in profile_skills to reference private.skill_proficiency(id)
ALTER TABLE private.profile_skills
  ALTER COLUMN proficiency SET DEFAULT 'intermediate',
  DROP CONSTRAINT IF EXISTS profile_skills_proficiency_fkey,
  ADD CONSTRAINT profile_skills_proficiency_fkey
    FOREIGN KEY (proficiency) REFERENCES private.skill_proficiency(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_profile_skills_skill_id ON private.profile_skills(skill_id);

-- Ensure RLS on private.profile_skills
ALTER TABLE private.profile_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_skills_select_policy" ON private.profile_skills;
CREATE POLICY "profile_skills_select_policy" ON private.profile_skills
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profile_skills_insert_policy" ON private.profile_skills;
CREATE POLICY "profile_skills_insert_policy" ON private.profile_skills
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "profile_skills_update_policy" ON private.profile_skills;
CREATE POLICY "profile_skills_update_policy" ON private.profile_skills
  FOR UPDATE TO authenticated USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "profile_skills_delete_policy" ON private.profile_skills;
CREATE POLICY "profile_skills_delete_policy" ON private.profile_skills
  FOR DELETE TO authenticated USING (auth.uid() = profile_id);

GRANT ALL ON TABLE private.profile_skills TO authenticated, service_role;

-- 5. Updated Stored Procedures

-- 5.1 Profile.getProfile()
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
            'skill_id', ps.skill_id,
            'skill_name', s.name,
            'proficiency', ps.proficiency,
            'created_at', ps.created_at,
            'updated_at', ps.updated_at
          )
        )
        FROM private.profile_skills ps
        LEFT JOIN private.skills s ON s.id = ps.skill_id
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

-- 5.2 Profile.updateProfile(headline, objective, roles, availability, skills)
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
  _target_skill_id UUID;
  _prof TEXT;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure profile row exists
  INSERT INTO private.profiles (id, updated_at)
  VALUES (_uid, now())
  ON CONFLICT (id) DO NOTHING;

  -- Update profile attributes
  UPDATE private.profiles
  SET
    headline = COALESCE(update_profile.headline, private.profiles.headline),
    objective = COALESCE(update_profile.objective, private.profiles.objective),
    roles_free_text = COALESCE(update_profile.roles, private.profiles.roles_free_text),
    availability_schedule = COALESCE(update_profile.availability, private.profiles.availability_schedule),
    updated_at = now()
  WHERE id = _uid;

  -- Sync profile_skills if skills array is provided
  IF skills IS NOT NULL AND jsonb_typeof(skills) = 'array' THEN
    DELETE FROM private.profile_skills WHERE profile_id = _uid;

    FOR _skill IN SELECT * FROM jsonb_array_elements(skills)
    LOOP
      _target_skill_id := NULL;

      -- Check for skill_id or skill (UUID string)
      IF (_skill->>'skill_id') IS NOT NULL AND (_skill->>'skill_id') ~ '^[0-9a-fA-F-]{36}$' THEN
        _target_skill_id := (_skill->>'skill_id')::UUID;
      ELSIF (_skill->>'skill') IS NOT NULL AND (_skill->>'skill') ~ '^[0-9a-fA-F-]{36}$' THEN
        _target_skill_id := (_skill->>'skill')::UUID;
      ELSIF (_skill->>'name') IS NOT NULL AND trim(_skill->>'name') != '' THEN
        INSERT INTO private.skills (name)
        VALUES (trim(_skill->>'name'))
        ON CONFLICT (name) DO UPDATE SET updated_at = now()
        RETURNING id INTO _target_skill_id;
      END IF;

      _prof := LOWER(COALESCE(_skill->>'proficiency', 'intermediate'));
      IF _prof NOT IN ('beginner', 'intermediate', 'expert') THEN
        _prof := 'intermediate';
      END IF;

      IF _target_skill_id IS NOT NULL THEN
        INSERT INTO private.profile_skills (
          profile_id,
          skill_id,
          proficiency,
          updated_at
        )
        VALUES (
          _uid,
          _target_skill_id,
          _prof,
          now()
        )
        ON CONFLICT (profile_id, skill_id) DO UPDATE
        SET proficiency = EXCLUDED.proficiency, updated_at = now();
      END IF;
    END LOOP;
  END IF;

  RETURN public.get_profile(_uid);
END;
$$;
