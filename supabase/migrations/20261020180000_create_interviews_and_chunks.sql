-- Drop old public tables & functions if they exist
DROP TABLE IF EXISTS public.interview_chunks CASCADE;
DROP TABLE IF EXISTS public.interviews CASCADE;
DROP FUNCTION IF EXISTS public.get_interview_session(UUID);
DROP FUNCTION IF EXISTS public.record_interview_chunk(UUID, INTEGER, TEXT, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS public.get_interview_chunks(UUID);
DROP FUNCTION IF EXISTS public.finalize_interview_session(UUID, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.create_interview_session(UUID, UUID, TEXT, TEXT);

-- Ensure private schema exists and grant usage
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, anon, service_role;

-- Create private.interviews table
CREATE TABLE IF NOT EXISTS private.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Technical Interview',
  format TEXT NOT NULL DEFAULT '45m Technical Assessment',
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'declined')),
  master_recording_url TEXT,
  total_chunks INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for private.interviews
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
  USING (auth.uid() = candidate_id OR auth.uid() = interviewer_id);

-- Create private.interview_chunks table
CREATE TABLE IF NOT EXISTS private.interview_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES private.interviews(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  cloudinary_public_id TEXT NOT NULL,
  cloudinary_url TEXT NOT NULL,
  duration_seconds NUMERIC NOT NULL DEFAULT 30,
  transcript TEXT,
  transcribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(interview_id, chunk_index)
);

-- Enable RLS for private.interview_chunks
ALTER TABLE private.interview_chunks ENABLE ROW LEVEL SECURITY;

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
    EXISTS (
      SELECT 1 FROM private.interviews
      WHERE private.interviews.id = private.interview_chunks.interview_id
        AND (private.interviews.candidate_id = auth.uid() OR private.interviews.interviewer_id = auth.uid())
    )
  );

-- Grant table access to authenticated and service_role
GRANT ALL ON TABLE private.interviews TO authenticated, service_role;
GRANT ALL ON TABLE private.interview_chunks TO authenticated, service_role;
