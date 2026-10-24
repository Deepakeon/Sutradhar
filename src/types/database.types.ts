
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"private": {
          Tables: {
            "interview_chunks": {
                  Row: {
                    "chunk_index": number,"cloudinary_public_id": string,"cloudinary_url": string,"created_at": string,"duration_seconds": number,"end_offset_ms": number | null,"id": string,"interview_id": string,"profile_id": string | null,"role": string | null,"start_offset_ms": number,"transcribed_at": string | null,"transcript": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "chunk_index": number,"cloudinary_public_id": string,"cloudinary_url": string,"created_at"?: string,"duration_seconds"?: number,"end_offset_ms"?: number | null,"id"?: string,"interview_id": string,"profile_id"?: string | null,"role"?: string | null,"start_offset_ms"?: number,"transcribed_at"?: string | null,"transcript"?: string | null
                  }
                  Update: {
                    "chunk_index"?: number,"cloudinary_public_id"?: string,"cloudinary_url"?: string,"created_at"?: string,"duration_seconds"?: number,"end_offset_ms"?: number | null,"id"?: string,"interview_id"?: string,"profile_id"?: string | null,"role"?: string | null,"start_offset_ms"?: number,"transcribed_at"?: string | null,"transcript"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "interview_chunks_interview_id_fkey"
      columns: ["interview_id"]
isOneToOne: false
      referencedRelation: "interviews"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "interview_chunks_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"interviews": {
                  Row: {
                    "candidate_id": string,"compatibility_score": number | null,"created_at": string,"duration_seconds": number,"format": string,"id": string,"interviewer_id": string,"master_recording_url": string | null,"master_transcript": Json | null,"meeting_url": string | null,"notes": string | null,"scheduled_at": string,"session_started_at": string | null,"status": Database["private"]['Enums']["interview_status"],"title": string,"total_chunks": number,"transcript": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "candidate_id": string,"compatibility_score"?: number | null,"created_at"?: string,"duration_seconds"?: number,"format"?: string,"id"?: string,"interviewer_id": string,"master_recording_url"?: string | null,"master_transcript"?: Json | null,"meeting_url"?: string | null,"notes"?: string | null,"scheduled_at"?: string,"session_started_at"?: string | null,"status"?: Database["private"]['Enums']["interview_status"],"title"?: string,"total_chunks"?: number,"transcript"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "candidate_id"?: string,"compatibility_score"?: number | null,"created_at"?: string,"duration_seconds"?: number,"format"?: string,"id"?: string,"interviewer_id"?: string,"master_recording_url"?: string | null,"master_transcript"?: Json | null,"meeting_url"?: string | null,"notes"?: string | null,"scheduled_at"?: string,"session_started_at"?: string | null,"status"?: Database["private"]['Enums']["interview_status"],"title"?: string,"total_chunks"?: number,"transcript"?: string | null,"updated_at"?: string
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
                    "created_at": string,"id": string,"proficiency": string,"profile_id": string,"skill_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"proficiency"?: string,"profile_id": string,"skill_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"proficiency"?: string,"profile_id"?: string,"skill_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_skills_proficiency_fkey"
      columns: ["proficiency"]
isOneToOne: false
      referencedRelation: "skill_proficiency"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profile_skills_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profile_skills_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skills"
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
                },"skill_proficiency": {
                  Row: {
                    "created_at": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id": string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"skills": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"updated_at"?: string
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
            "interview_status": "pending"|"accepted"|"declined"|"revoked"|"completed"|"cancelled"
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
            "get_my_profile":
{ Args: Record<PropertyKey, never>; Returns: Json
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
  "graphql_public": {
          Enums: {
            
          }
        },"private": {
          Enums: {
            "interview_status": ["pending", "accepted", "declined", "revoked", "completed", "cancelled"]
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
