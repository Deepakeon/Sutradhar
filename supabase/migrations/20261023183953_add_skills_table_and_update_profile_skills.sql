-- ==============================================================================
-- Migration: 20261023183953_add_skills_table_and_update_profile_skills.sql
-- Description:
--   1. Create private.skills table (id PK, name string) with RLS
--   2. Drop obsolete skill_ids column and skill_proficiency enum
--   3. Create private.skill_proficiency reference table with RLS
--   4. Update private.profile_skills to link to skills and skill_proficiency
-- ==============================================================================

-- 1. Create private.skills table
CREATE TABLE private.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_skills_name ON private.skills(name);

ALTER TABLE private.skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "skills_select_policy" ON private.skills
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "skills_insert_policy" ON private.skills
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "skills_update_policy" ON private.skills
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON TABLE private.skills TO authenticated, anon, service_role;

-- 2. Drop obsolete array column, enum column, and enum type
DROP INDEX private.idx_profile_skills_skill_ids;

ALTER TABLE private.profile_skills
  DROP COLUMN skill_ids,
  DROP COLUMN proficiency;

DROP TYPE private.skill_proficiency;

-- 3. Create private.skill_proficiency reference table
CREATE TABLE private.skill_proficiency (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE private.skill_proficiency ENABLE ROW LEVEL SECURITY;

CREATE POLICY "skill_proficiency_select_policy" ON private.skill_proficiency
  FOR SELECT TO authenticated, anon USING (true);

GRANT ALL ON TABLE private.skill_proficiency TO authenticated, anon, service_role;

-- 4. Update private.profile_skills with foreign keys
ALTER TABLE private.profile_skills
  ADD COLUMN skill_id UUID NOT NULL REFERENCES private.skills(id) ON DELETE CASCADE,
  ADD COLUMN proficiency TEXT NOT NULL DEFAULT 'intermediate' REFERENCES private.skill_proficiency(id) ON DELETE RESTRICT,
  ADD CONSTRAINT profile_skills_profile_skill_unique UNIQUE (profile_id, skill_id);

CREATE INDEX idx_profile_skills_skill_id ON private.profile_skills(skill_id);
