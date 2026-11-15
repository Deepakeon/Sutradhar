-- Migration: 20261115174000_remove_cloudinary_from_interview_chunks.sql
-- Description: Replace legacy storage columns with generic storage_path and chunk_url

ALTER TABLE private.interview_chunks
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS chunk_url TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'private' AND table_name = 'interview_chunks' AND column_name = 'cloudinary_public_id'
  ) THEN
    UPDATE private.interview_chunks
      SET storage_path = COALESCE(storage_path, cloudinary_public_id);
    ALTER TABLE private.interview_chunks ALTER COLUMN cloudinary_public_id DROP NOT NULL;
    ALTER TABLE private.interview_chunks DROP COLUMN IF EXISTS cloudinary_public_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'private' AND table_name = 'interview_chunks' AND column_name = 'cloudinary_url'
  ) THEN
    UPDATE private.interview_chunks
      SET chunk_url = COALESCE(chunk_url, cloudinary_url);
    ALTER TABLE private.interview_chunks ALTER COLUMN cloudinary_url DROP NOT NULL;
    ALTER TABLE private.interview_chunks DROP COLUMN IF EXISTS cloudinary_url;
  END IF;
END $$;
