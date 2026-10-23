-- ==============================================================================
-- Sutradhar Local Development Seed Data
-- ==============================================================================

-- 1. Seed skill_proficiency reference table
INSERT INTO private.skill_proficiency (id, name)
VALUES
  ('beginner', 'Beginner'),
  ('intermediate', 'Intermediate'),
  ('expert', 'Expert')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. Seed common technical skills
INSERT INTO private.skills (id, name)
VALUES
  ('a1111111-1111-1111-1111-111111111101', 'Distributed Systems'),
  ('a1111111-1111-1111-1111-111111111102', 'System Design'),
  ('a1111111-1111-1111-1111-111111111103', 'Distributed Consensus (Raft / Paxos)'),
  ('a1111111-1111-1111-1111-111111111104', 'High-Throughput Storage & LSM Trees'),
  ('a1111111-1111-1111-1111-111111111105', 'Concurrency & Deadlock Resolution'),
  ('a1111111-1111-1111-1111-111111111106', 'Go & Rust Systems Programming'),
  ('a1111111-1111-1111-1111-111111111107', 'TypeScript'),
  ('a1111111-1111-1111-1111-111111111108', 'React'),
  ('a1111111-1111-1111-1111-111111111109', 'Next.js'),
  ('a1111111-1111-1111-1111-111111111110', 'Node.js'),
  ('a1111111-1111-1111-1111-111111111111', 'Python'),
  ('a1111111-1111-1111-1111-111111111112', 'PostgreSQL'),
  ('a1111111-1111-1111-1111-111111111113', 'Docker'),
  ('a1111111-1111-1111-1111-111111111114', 'Kubernetes'),
  ('a1111111-1111-1111-1111-111111111115', 'WebRTC'),
  ('a1111111-1111-1111-1111-111111111116', 'Cloudflare Workers'),
  ('a1111111-1111-1111-1111-111111111117', 'GraphQL'),
  ('a1111111-1111-1111-1111-111111111118', 'Kafka'),
  ('a1111111-1111-1111-1111-111111111119', 'Redis')
ON CONFLICT (name) DO NOTHING;
