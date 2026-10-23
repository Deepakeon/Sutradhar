import type { Database } from './database.types';

export type ProfileRow = Database['private']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['private']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['private']['Tables']['profiles']['Update'];

export type ProfileSkillRow = Database['private']['Tables']['profile_skills']['Row'];
export type ProfileSkillInsert = Database['private']['Tables']['profile_skills']['Insert'];
export type ProfileSkillUpdate = Database['private']['Tables']['profile_skills']['Update'];

export type SkillProficiency = Database['private']['Enums']['skill_proficiency'];

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  headline?: string | null;
  objective?: string | null;
  roles_free_text?: string | null;
  availability_schedule?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  skills?: ProfileSkill[];
}

export interface ProfileSkill {
  id: string;
  profile_id: string;
  skill_ids: string[];
  proficiency: SkillProficiency;
  created_at?: string;
  updated_at?: string;
}
