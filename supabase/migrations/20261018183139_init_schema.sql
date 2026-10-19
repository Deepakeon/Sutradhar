-- Create private schema for isolated user data
CREATE SCHEMA IF NOT EXISTS private;

-- Restrict private schema access
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;
GRANT USAGE ON SCHEMA private TO service_role;
GRANT USAGE ON SCHEMA private TO postgres;

-- Create private.profiles table
CREATE TABLE IF NOT EXISTS private.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grant table permissions to internal roles only
GRANT ALL ON TABLE private.profiles TO service_role;
GRANT ALL ON TABLE private.profiles TO postgres;

-- Function to handle new user signup from auth.users (Google OAuth metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, auth
AS $$
BEGIN
  INSERT INTO private.profiles (id, email, full_name, avatar_url, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger to execute on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Security Definer function to get current user's profile
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, auth
AS $$
DECLARE
  _profile JSONB;
BEGIN
  SELECT to_jsonb(p) INTO _profile
  FROM private.profiles p
  WHERE p.id = auth.uid();

  RETURN _profile;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
