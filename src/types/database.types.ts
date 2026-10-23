
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "private": {
          Tables: {
            "interview_chunks": {
                  Row: {
                    "chunk_index": number,"cloudinary_public_id": string,"cloudinary_url": string,"created_at": string,"duration_seconds": number,"id": string,"interview_id": string,"transcribed_at": string | null,"transcript": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "chunk_index": number,"cloudinary_public_id": string,"cloudinary_url": string,"created_at"?: string,"duration_seconds"?: number,"id"?: string,"interview_id": string,"transcribed_at"?: string | null,"transcript"?: string | null
                  }
                  Update: {
                    "chunk_index"?: number,"cloudinary_public_id"?: string,"cloudinary_url"?: string,"created_at"?: string,"duration_seconds"?: number,"id"?: string,"interview_id"?: string,"transcribed_at"?: string | null,"transcript"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "interview_chunks_interview_id_fkey"
      columns: ["interview_id"]
isOneToOne: false
      referencedRelation: "interviews"
      referencedColumns: ["id"]
    }
                  ]
                },"interviews": {
                  Row: {
                    "candidate_id": string,"compatibility_score": number | null,"created_at": string,"duration_seconds": number,"format": string,"id": string,"interviewer_id": string,"master_recording_url": string | null,"meeting_url": string | null,"notes": string | null,"scheduled_at": string,"status": Database["private"]['Enums']["interview_status"],"title": string,"total_chunks": number,"transcript": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "candidate_id": string,"compatibility_score"?: number | null,"created_at"?: string,"duration_seconds"?: number,"format"?: string,"id"?: string,"interviewer_id": string,"master_recording_url"?: string | null,"meeting_url"?: string | null,"notes"?: string | null,"scheduled_at"?: string,"status"?: Database["private"]['Enums']["interview_status"],"title"?: string,"total_chunks"?: number,"transcript"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "candidate_id"?: string,"compatibility_score"?: number | null,"created_at"?: string,"duration_seconds"?: number,"format"?: string,"id"?: string,"interviewer_id"?: string,"master_recording_url"?: string | null,"meeting_url"?: string | null,"notes"?: string | null,"scheduled_at"?: string,"status"?: Database["private"]['Enums']["interview_status"],"title"?: string,"total_chunks"?: number,"transcript"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "interviews_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "interviews_interviewer_id_fkey"
      columns: ["interviewer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_skills": {
                  Row: {
                    "created_at": string,"id": string,"proficiency": Database["private"]['Enums']["skill_proficiency"],"profile_id": string,"skill_ids": (string)[],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"proficiency"?: Database["private"]['Enums']["skill_proficiency"],"profile_id": string,"skill_ids"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"proficiency"?: Database["private"]['Enums']["skill_proficiency"],"profile_id"?: string,"skill_ids"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_skills_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "availability_schedule": Json | null,"avatar_url": string | null,"created_at": string,"email": string | null,"full_name": string | null,"headline": string | null,"id": string,"objective": string | null,"roles_free_text": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "availability_schedule"?: Json | null,"avatar_url"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string | null,"headline"?: string | null,"id": string,"objective"?: string | null,"roles_free_text"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "availability_schedule"?: Json | null,"avatar_url"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string | null,"headline"?: string | null,"id"?: string,"objective"?: string | null,"roles_free_text"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            "interview_status": "pending"|"accepted"|"declined"|"revoked"|"completed"|"cancelled","skill_proficiency": "beginner"|"intermediate"|"expert"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "create_interview":
{ Args: { "candidate_id": string,"compatibility_score"?: number,"format"?: string,"interviewer_id": string,"meeting_url"?: string,"notes"?: string,"scheduled_at"?: string,"title"?: string,"transcript"?: string }; Returns: Json
                           },
"get_my_profile":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_profile":
{ Args: { "target_profile_id"?: string }; Returns: Json
                           },
"launch_meeting_room":
{ Args: { "interview_id": string }; Returns: Json
                           },
"update_interview_status":
{ Args: { "interview_id": string,"notes"?: string,"status": string }; Returns: Json
                           },
"update_profile":
{ Args: { "availability"?: Json,"headline"?: string,"objective"?: string,"roles"?: string,"skills"?: Json }; Returns: Json
                           },
"update_status":
{ Args: { "interview_id": string,"notes"?: string,"status": string }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "private": {
          Enums: {
            "interview_status": ["pending", "accepted", "declined", "revoked", "completed", "cancelled"],"skill_proficiency": ["beginner", "intermediate", "expert"]
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
