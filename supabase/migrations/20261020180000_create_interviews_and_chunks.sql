-- Drop old public tables if they exist
DROP TABLE IF EXISTS public.interview_chunks CASCADE;
DROP TABLE IF EXISTS public.interviews CASCADE;

-- Ensure private schema exists
CREATE SCHEMA IF NOT EXISTS private;

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

-- Grant table access to service_role and postgres only
GRANT ALL ON TABLE private.interviews TO service_role;
GRANT ALL ON TABLE private.interviews TO postgres;
GRANT ALL ON TABLE private.interview_chunks TO service_role;
GRANT ALL ON TABLE private.interview_chunks TO postgres;

-- 1. Security Definer Function: Get Interview Session
CREATE OR REPLACE FUNCTION public.get_interview_session(p_interview_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, auth
AS $$
DECLARE
  _interview JSONB;
BEGIN
  SELECT to_jsonb(i) INTO _interview
  FROM private.interviews i
  WHERE i.id = p_interview_id
    AND (i.candidate_id = auth.uid() OR i.interviewer_id = auth.uid());

  RETURN _interview;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_interview_session(UUID) TO authenticated;

-- 2. Security Definer Function: Record Interview Chunk
CREATE OR REPLACE FUNCTION public.record_interview_chunk(
  p_interview_id UUID,
  p_chunk_index INTEGER,
  p_cloudinary_public_id TEXT,
  p_cloudinary_url TEXT,
  p_duration_seconds NUMERIC DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, auth
AS $$
DECLARE
  _chunk JSONB;
BEGIN
  -- Verify caller is participant
  IF NOT EXISTS (
    SELECT 1 FROM private.interviews
    WHERE id = p_interview_id
      AND (candidate_id = auth.uid() OR interviewer_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Forbidden: Profile not participant in this interview';
  END IF;

  INSERT INTO private.interview_chunks (
    interview_id,
    chunk_index,
    cloudinary_public_id,
    cloudinary_url,
    duration_seconds
  )
  VALUES (
    p_interview_id,
    p_chunk_index,
    p_cloudinary_public_id,
    p_cloudinary_url,
    p_duration_seconds
  )
  ON CONFLICT (interview_id, chunk_index) DO UPDATE
    SET cloudinary_public_id = EXCLUDED.cloudinary_public_id,
        cloudinary_url = EXCLUDED.cloudinary_url,
        duration_seconds = EXCLUDED.duration_seconds
  RETURNING to_jsonb(interview_chunks.*) INTO _chunk;

  RETURN _chunk;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_interview_chunk(UUID, INTEGER, TEXT, TEXT, NUMERIC) TO authenticated;

-- 3. Security Definer Function: Get Interview Chunks
CREATE OR REPLACE FUNCTION public.get_interview_chunks(p_interview_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, auth
AS $$
DECLARE
  _chunks JSONB;
BEGIN
  -- Verify caller is participant
  IF NOT EXISTS (
    SELECT 1 FROM private.interviews
    WHERE id = p_interview_id
      AND (candidate_id = auth.uid() OR interviewer_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Forbidden: Profile not participant in this interview';
  END IF;

  SELECT jsonb_agg(to_jsonb(c) ORDER BY c.chunk_index ASC) INTO _chunks
  FROM private.interview_chunks c
  WHERE c.interview_id = p_interview_id;

  RETURN COALESCE(_chunks, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_interview_chunks(UUID) TO authenticated;

-- 4. Security Definer Function: Finalize Interview Session
CREATE OR REPLACE FUNCTION public.finalize_interview_session(
  p_interview_id UUID,
  p_master_recording_url TEXT,
  p_total_chunks INTEGER,
  p_duration_seconds INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, auth
AS $$
DECLARE
  _updated JSONB;
BEGIN
  -- Verify caller is participant
  IF NOT EXISTS (
    SELECT 1 FROM private.interviews
    WHERE id = p_interview_id
      AND (candidate_id = auth.uid() OR interviewer_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Forbidden: Profile not participant in this interview';
  END IF;

  UPDATE private.interviews
  SET status = 'completed',
      master_recording_url = p_master_recording_url,
      total_chunks = p_total_chunks,
      duration_seconds = p_duration_seconds,
      updated_at = now()
  WHERE id = p_interview_id
  RETURNING to_jsonb(interviews.*) INTO _updated;

  RETURN _updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_interview_session(UUID, TEXT, INTEGER, INTEGER) TO authenticated;

-- 5. Helper Function: Create Interview Session (for test/scheduling)
CREATE OR REPLACE FUNCTION public.create_interview_session(
  p_candidate_id UUID,
  p_interviewer_id UUID,
  p_title TEXT DEFAULT 'Technical Interview',
  p_format TEXT DEFAULT '45m Technical Assessment'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, auth
AS $$
DECLARE
  _new_interview JSONB;
BEGIN
  INSERT INTO private.interviews (
    candidate_id,
    interviewer_id,
    title,
    format,
    status
  )
  VALUES (
    p_candidate_id,
    p_interviewer_id,
    p_title,
    p_format,
    'accepted'
  )
  RETURNING to_jsonb(interviews.*) INTO _new_interview;

  RETURN _new_interview;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_interview_session(UUID, UUID, TEXT, TEXT) TO authenticated, service_role;
