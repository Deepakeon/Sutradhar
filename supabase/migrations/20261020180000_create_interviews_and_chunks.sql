-- Create public.interviews table
CREATE TABLE IF NOT EXISTS public.interviews (
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

-- Enable RLS for interviews
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interviews_select_policy" ON public.interviews;
CREATE POLICY "interviews_select_policy" ON public.interviews
  FOR SELECT
  TO authenticated
  USING (auth.uid() = candidate_id OR auth.uid() = interviewer_id);

DROP POLICY IF EXISTS "interviews_insert_policy" ON public.interviews;
CREATE POLICY "interviews_insert_policy" ON public.interviews
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = candidate_id OR auth.uid() = interviewer_id);

DROP POLICY IF EXISTS "interviews_update_policy" ON public.interviews;
CREATE POLICY "interviews_update_policy" ON public.interviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = candidate_id OR auth.uid() = interviewer_id);

-- Create public.interview_chunks table
CREATE TABLE IF NOT EXISTS public.interview_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  cloudinary_public_id TEXT NOT NULL,
  cloudinary_url TEXT NOT NULL,
  duration_seconds NUMERIC NOT NULL DEFAULT 30,
  transcript TEXT,
  transcribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(interview_id, chunk_index)
);

-- Enable RLS for interview_chunks
ALTER TABLE public.interview_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chunks_select_policy" ON public.interview_chunks;
CREATE POLICY "chunks_select_policy" ON public.interview_chunks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.interviews
      WHERE public.interviews.id = public.interview_chunks.interview_id
        AND (public.interviews.candidate_id = auth.uid() OR public.interviews.interviewer_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "chunks_insert_policy" ON public.interview_chunks;
CREATE POLICY "chunks_insert_policy" ON public.interview_chunks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.interviews
      WHERE public.interviews.id = public.interview_chunks.interview_id
        AND (public.interviews.candidate_id = auth.uid() OR public.interviews.interviewer_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "chunks_update_policy" ON public.interview_chunks;
CREATE POLICY "chunks_update_policy" ON public.interview_chunks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.interviews
      WHERE public.interviews.id = public.interview_chunks.interview_id
        AND (public.interviews.candidate_id = auth.uid() OR public.interviews.interviewer_id = auth.uid())
    )
  );

-- Grant table access to authenticated and service_role
GRANT ALL ON TABLE public.interviews TO authenticated, service_role;
GRANT ALL ON TABLE public.interview_chunks TO authenticated, service_role;
