# Private Schema for Profiles

Profile records are isolated in a custom `private` database schema (`private.profiles`) rather than `public.profiles`. Next.js applications and external clients cannot query the profiles table directly via PostgREST; all read and write interactions are mediated via Postgres triggers and explicit `SECURITY DEFINER` functions in `public`. This prevents accidental public exposure of profile data via PostgREST while decoupling database persistence from client-facing REST endpoints.
