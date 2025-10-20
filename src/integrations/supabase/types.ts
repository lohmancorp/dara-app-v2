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
      account_members: {
        Row: {
          account_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_members_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_jobs: {
        Row: {
          chat_session_id: string | null
          completed_at: string | null
          created_at: string
          error: string | null
          filters: Json | null
          id: string
          job_sequence: number | null
          progress: number | null
          progress_message: string | null
          query: string
          result: Json | null
          started_at: string | null
          status: string
          total_tickets: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_session_id?: string | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          filters?: Json | null
          id?: string
          job_sequence?: number | null
          progress?: number | null
          progress_message?: string | null
          query: string
          result?: Json | null
          started_at?: string | null
          status?: string
          total_tickets?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_session_id?: string | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          filters?: Json | null
          id?: string
          job_sequence?: number | null
          progress?: number | null
          progress_message?: string | null
          query?: string
          result?: Json | null
          started_at?: string | null
          status?: string
          total_tickets?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_jobs_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          job_id: string | null
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          job_id?: string | null
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          job_id?: string | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "chat_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          is_archived: boolean
          last_message_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_archived?: boolean
          last_message_at?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_archived?: boolean
          last_message_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      connection_tokens: {
        Row: {
          auth_config: Json | null
          auth_type: string
          created_at: string
          encrypted_token: string
          endpoint: string | null
          id: string
          owner_id: string
          owner_type: string
          service_id: string
          updated_at: string
        }
        Insert: {
          auth_config?: Json | null
          auth_type?: string
          created_at?: string
          encrypted_token: string
          endpoint?: string | null
          id?: string
          owner_id: string
          owner_type: string
          service_id: string
          updated_at?: string
        }
        Update: {
          auth_config?: Json | null
          auth_type?: string
          created_at?: string
          encrypted_token?: string
          endpoint?: string | null
          id?: string
          owner_id?: string
          owner_type?: string
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_tokens_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "mcp_services"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          account_id: string | null
          auth_config: Json | null
          auth_type: string
          call_delay_ms: number | null
          connection_config: Json | null
          connection_type: string
          created_at: string
          endpoint: string | null
          id: string
          is_active: boolean | null
          is_chat_default: boolean | null
          is_mcp_managed: boolean | null
          max_retries: number | null
          mcp_service_id: string | null
          name: string
          retry_delay_sec: number | null
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          auth_config?: Json | null
          auth_type: string
          call_delay_ms?: number | null
          connection_config?: Json | null
          connection_type: string
          created_at?: string
          endpoint?: string | null
          id?: string
          is_active?: boolean | null
          is_chat_default?: boolean | null
          is_mcp_managed?: boolean | null
          max_retries?: number | null
          mcp_service_id?: string | null
          name: string
          retry_delay_sec?: number | null
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          auth_config?: Json | null
          auth_type?: string
          call_delay_ms?: number | null
          connection_config?: Json | null
          connection_type?: string
          created_at?: string
          endpoint?: string | null
          id?: string
          is_active?: boolean | null
          is_chat_default?: boolean | null
          is_mcp_managed?: boolean | null
          max_retries?: number | null
          mcp_service_id?: string | null
          name?: string
          retry_delay_sec?: number | null
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connections_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_mcp_service_id_fkey"
            columns: ["mcp_service_id"]
            isOneToOne: false
            referencedRelation: "mcp_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
          secondary_connections: string[] | null
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
          secondary_connections?: string[] | null
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
          secondary_connections?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mcp_service_tokens: {
        Row: {
          auth_config: Json | null
          auth_type: string
          created_at: string
          encrypted_token: string
          id: string
          service_id: string
          updated_at: string
        }
        Insert: {
          auth_config?: Json | null
          auth_type?: string
          created_at?: string
          encrypted_token: string
          id?: string
          service_id: string
          updated_at?: string
        }
        Update: {
          auth_config?: Json | null
          auth_type?: string
          created_at?: string
          encrypted_token?: string
          id?: string
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_service_tokens_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: true
            referencedRelation: "mcp_services"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_services: {
        Row: {
          allow_custom_endpoint: boolean
          call_delay_ms: number | null
          created_at: string
          description: string | null
          endpoint_template: string | null
          id: string
          is_active: boolean
          max_retries: number | null
          rate_limit_per_hour: number | null
          rate_limit_per_minute: number | null
          resources_config: Json | null
          retry_delay_sec: number | null
          service_name: string
          service_type: string
          tags: string[] | null
          tools_config: Json | null
          updated_at: string
          uses_app_token: boolean
        }
        Insert: {
          allow_custom_endpoint?: boolean
          call_delay_ms?: number | null
          created_at?: string
          description?: string | null
          endpoint_template?: string | null
          id?: string
          is_active?: boolean
          max_retries?: number | null
          rate_limit_per_hour?: number | null
          rate_limit_per_minute?: number | null
          resources_config?: Json | null
          retry_delay_sec?: number | null
          service_name: string
          service_type: string
          tags?: string[] | null
          tools_config?: Json | null
          updated_at?: string
          uses_app_token?: boolean
        }
        Update: {
          allow_custom_endpoint?: boolean
          call_delay_ms?: number | null
          created_at?: string
          description?: string | null
          endpoint_template?: string | null
          id?: string
          is_active?: boolean
          max_retries?: number | null
          rate_limit_per_hour?: number | null
          rate_limit_per_minute?: number | null
          resources_config?: Json | null
          retry_delay_sec?: number | null
          service_name?: string
          service_type?: string
          tags?: string[] | null
          tools_config?: Json | null
          updated_at?: string
          uses_app_token?: boolean
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
      team_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          account_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      get_next_job_sequence: {
        Args: { p_session_id: string }
        Returns: number
      }
      has_account_role: {
        Args: {
          _account_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_team_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _team_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_account_member: {
        Args: { _account_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "app_admin" | "account_admin" | "team_manager" | "user"
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
    Enums: {
      app_role: ["app_admin", "account_admin", "team_manager", "user"],
    },
  },
} as const
