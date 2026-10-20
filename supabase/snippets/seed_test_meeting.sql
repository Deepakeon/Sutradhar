-- Seed 2 test users and 1 interview session in private schema
DO $$
DECLARE
  cand_id UUID := '11111111-1111-1111-1111-111111111111';
  intv_id UUID := '22222222-2222-2222-2222-222222222222';
  meet_id UUID := '33333333-3333-3333-3333-333333333333';
BEGIN
  -- Insert candidate user if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = cand_id) THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
    VALUES (cand_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'candidate@example.com', '', '{"full_name": "Candidate Alice"}', now(), now());
  END IF;

  -- Insert interviewer user if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = intv_id) THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
    VALUES (intv_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'interviewer@example.com', '', '{"full_name": "Interviewer Bob"}', now(), now());
  END IF;

  -- Insert test interview session into private.interviews if not exists
  IF NOT EXISTS (SELECT 1 FROM private.interviews WHERE id = meet_id) THEN
    INSERT INTO private.interviews (id, candidate_id, interviewer_id, title, format, status)
    VALUES (meet_id, cand_id, intv_id, 'Technical System Design Interview', '45m System Design', 'accepted');
  END IF;
END $$;
