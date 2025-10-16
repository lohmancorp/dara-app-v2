export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      connections: {
        Row: {
          auth_config: Json | null
          auth_type: string
          call_delay_ms: number | null
          connection_config: Json | null
          connection_type: string
          created_at: string
          endpoint: string | null
          id: string
          is_active: boolean | null
          max_retries: number | null
          name: string
          retry_delay_sec: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_config?: Json | null
          auth_type: string
          call_delay_ms?: number | null
          connection_config?: Json | null
          connection_type: string
          created_at?: string
          endpoint?: string | null
          id?: string
          is_active?: boolean | null
          max_retries?: number | null
          name: string
          retry_delay_sec?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_config?: Json | null
          auth_type?: string
          call_delay_ms?: number | null
          connection_config?: Json | null
          connection_type?: string
          created_at?: string
          endpoint?: string | null
          id?: string
          is_active?: boolean | null
          max_retries?: number | null
          name?: string
          retry_delay_sec?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      job_templates: {
        Row: {
          created_at: string
          id: string
          job_connection: string
          job_description: string
          job_name: string
          job_outcome: string
          job_prompt: string
          job_tags: string[] | null
          job_team: string[] | null
          research_depth: string
          research_exactness: string
          research_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_connection: string
          job_description: string
          job_name: string
          job_outcome: string
          job_prompt: string
          job_tags?: string[] | null
          job_team?: string[] | null
          research_depth: string
          research_exactness: string
          research_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_connection?: string
          job_description?: string
          job_name?: string
          job_outcome?: string
          job_prompt?: string
          job_tags?: string[] | null
          job_team?: string[] | null
          research_depth?: string
          research_exactness?: string
          research_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company: string | null
          created_at: string
          data_sharing: boolean | null
          email: string
          email_notifications: boolean | null
          full_name: string | null
          id: string
          job_title: string | null
          language_code: string | null
          location: string | null
          research_complete_notifications: boolean | null
          timezone: string | null
          updated_at: string
          website: string | null
          weekly_summary_notifications: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          data_sharing?: boolean | null
          email: string
          email_notifications?: boolean | null
          full_name?: string | null
          id: string
          job_title?: string | null
          language_code?: string | null
          location?: string | null
          research_complete_notifications?: boolean | null
          timezone?: string | null
          updated_at?: string
          website?: string | null
          weekly_summary_notifications?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          data_sharing?: boolean | null
          email?: string
          email_notifications?: boolean | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          language_code?: string | null
          location?: string | null
          research_complete_notifications?: boolean | null
          timezone?: string | null
          updated_at?: string
          website?: string | null
          weekly_summary_notifications?: boolean | null
        }
        Relationships: []
      }
      prompt_templates: {
        Row: {
          created_at: string
          id: string
          prompt: string
          prompt_description: string
          prompt_model: string
          prompt_name: string
          prompt_outcome: string
          prompt_tags: string[] | null
          prompt_team: string[] | null
          system_outcome: string
          system_prompt: string
          total_prompt_cost: number | null
          total_tokens: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prompt: string
          prompt_description: string
          prompt_model: string
          prompt_name: string
          prompt_outcome: string
          prompt_tags?: string[] | null
          prompt_team?: string[] | null
          system_outcome: string
          system_prompt: string
          total_prompt_cost?: number | null
          total_tokens?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prompt?: string
          prompt_description?: string
          prompt_model?: string
          prompt_name?: string
          prompt_outcome?: string
          prompt_tags?: string[] | null
          prompt_team?: string[] | null
          system_outcome?: string
          system_prompt?: string
          total_prompt_cost?: number | null
          total_tokens?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      template_votes: {
        Row: {
          created_at: string
          id: string
          template_id: string
          template_type: string
          updated_at: string
          user_id: string
          vote: number
        }
        Insert: {
          created_at?: string
          id?: string
          template_id: string
          template_type: string
          updated_at?: string
          user_id: string
          vote: number
        }
        Update: {
          created_at?: string
          id?: string
          template_id?: string
          template_type?: string
          updated_at?: string
          user_id?: string
          vote?: number
        }
        Relationships: []
      }
      vote_feedback: {
        Row: {
          created_at: string
          feedback: string
          id: string
          template_id: string
          template_type: string
          updated_at: string
          user_id: string
          vote_id: string
        }
        Insert: {
          created_at?: string
          feedback: string
          id?: string
          template_id: string
          template_type: string
          updated_at?: string
          user_id: string
          vote_id: string
        }
        Update: {
          created_at?: string
          feedback?: string
          id?: string
          template_id?: string
          template_type?: string
          updated_at?: string
          user_id?: string
          vote_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_connection_type_for_mapping: {
        Args: { _connection_id: string }
        Returns: string
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
