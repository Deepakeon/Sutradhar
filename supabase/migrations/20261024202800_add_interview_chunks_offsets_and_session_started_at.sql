-- Migration: 20261024202800_add_interview_chunks_offsets_and_session_started_at.sql
-- Description: Add millisecond offset columns and dual-party role/profile tracking to interview_chunks, and session_started_at to interviews

-- 1. Add session_started_at and master_transcript to private.interviews
ALTER TABLE private.interviews
  ADD COLUMN IF NOT EXISTS session_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS master_transcript JSONB DEFAULT '[]'::jsonb;

-- 2. Add dual-party tracking and millisecond offset columns to private.interview_chunks
ALTER TABLE private.interview_chunks
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES private.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS start_offset_ms BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS end_offset_ms BIGINT,
  ALTER COLUMN duration_seconds SET DEFAULT 10;

-- 3. Update unique constraint on private.interview_chunks to support dual participants
ALTER TABLE private.interview_chunks
  DROP CONSTRAINT IF EXISTS interview_chunks_interview_id_chunk_index_key;

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

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_interview_chunks_interview_profile
  ON private.interview_chunks(interview_id, profile_id);

CREATE INDEX IF NOT EXISTS idx_interview_chunks_start_offset
  ON private.interview_chunks(interview_id, start_offset_ms);

