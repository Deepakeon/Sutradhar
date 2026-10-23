import type { Database } from './database.types';

export type ProfileRow = Database['private']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['private']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['private']['Tables']['profiles']['Update'];

export type ProfileSkillRow = Database['private']['Tables']['profile_skills']['Row'];
export type ProfileSkillInsert = Database['private']['Tables']['profile_skills']['Insert'];
export type ProfileSkillUpdate = Database['private']['Tables']['profile_skills']['Update'];

export type SkillRow = Database['private']['Tables']['skills']['Row'];
export type SkillInsert = Database['private']['Tables']['skills']['Insert'];
export type SkillUpdate = Database['private']['Tables']['skills']['Update'];

export type SkillProficiencyRow = Database['private']['Tables']['skill_proficiency']['Row'];

export type SkillProficiency = 'beginner' | 'intermediate' | 'expert';

export interface Skill {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

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
  skill_id: string;
  skill_name?: string;
  skill?: Skill;
  proficiency: SkillProficiency;
  created_at?: string;
  updated_at?: string;
}
