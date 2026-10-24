-- Migration: 20261024194500_dual_party_audio_chunks_schema.sql
-- Description: Dual-party 10s audio streaming schema updates for private.interview_chunks & private.interviews

-- 1. Ensure private schema usage
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, anon, service_role;

-- 2. Add session_started_at and master_transcript to private.interviews
ALTER TABLE private.interviews
  ADD COLUMN IF NOT EXISTS session_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS master_transcript JSONB DEFAULT '[]'::jsonb;

-- 3. Update private.interview_chunks table for dual-party support and time anchoring
ALTER TABLE private.interview_chunks
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES private.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS start_offset_ms BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS end_offset_ms BIGINT,
  ALTER COLUMN duration_seconds SET DEFAULT 10;

-- Drop previous unique constraint on (interview_id, chunk_index)
ALTER TABLE private.interview_chunks
  DROP CONSTRAINT IF EXISTS interview_chunks_interview_id_chunk_index_key;

-- Add new composite unique constraint on (interview_id, profile_id, chunk_index)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'interview_chunks_interview_profile_chunk_idx'
  ) THEN
    ALTER TABLE private.interview_chunks
      ADD CONSTRAINT interview_chunks_interview_profile_chunk_idx
      UNIQUE (interview_id, profile_id, chunk_index);
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_interview_chunks_interview_profile
  ON private.interview_chunks(interview_id, profile_id);

CREATE INDEX IF NOT EXISTS idx_interview_chunks_start_offset
  ON private.interview_chunks(interview_id, start_offset_ms);

-- 4. Update RLS policies for private.interview_chunks
DROP POLICY IF EXISTS "chunks_select_policy" ON private.interview_chunks;
CREATE POLICY "chunks_select_policy" ON private.interview_chunks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.interviews
      WHERE private.interviews.id = private.interview_chunks.interview_id
        AND (private.interviews.candidate_id = auth.uid() OR private.interviews.interviewer_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "chunks_insert_policy" ON private.interview_chunks;
CREATE POLICY "chunks_insert_policy" ON private.interview_chunks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = profile_id AND
    EXISTS (
      SELECT 1 FROM private.interviews
      WHERE private.interviews.id = private.interview_chunks.interview_id
        AND (private.interviews.candidate_id = auth.uid() OR private.interviews.interviewer_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "chunks_update_policy" ON private.interview_chunks;
CREATE POLICY "chunks_update_policy" ON private.interview_chunks
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = profile_id AND
    EXISTS (
      SELECT 1 FROM private.interviews
      WHERE private.interviews.id = private.interview_chunks.interview_id
        AND (private.interviews.candidate_id = auth.uid() OR private.interviews.interviewer_id = auth.uid())
    )
  );

-- Grants
GRANT ALL ON TABLE private.interviews TO authenticated, service_role;
GRANT ALL ON TABLE private.interview_chunks TO authenticated, service_role;
