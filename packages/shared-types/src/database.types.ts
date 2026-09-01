export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      daily_goal_versions: {
        Row: {
          amount: number | null
          created_at: string
          effective_from: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          effective_from: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          effective_from?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      group_memberships: {
        Row: {
          alias_key: string | null
          alias_name: string | null
          alias_normalized: string | null
          created_at: string
          group_id: string
          id: string
          invite_id: string | null
          joined_at: string
          left_at: string | null
          sharing_consent_version: string
          user_id: string
        }
        Insert: {
          alias_key?: string | null
          alias_name?: string | null
          alias_normalized?: string | null
          created_at?: string
          group_id: string
          id?: string
          invite_id?: string | null
          joined_at?: string
          left_at?: string | null
          sharing_consent_version: string
          user_id: string
        }
        Update: {
          alias_key?: string | null
          alias_name?: string | null
          alias_normalized?: string | null
          created_at?: string
          group_id?: string
          id?: string
          invite_id?: string | null
          joined_at?: string
          left_at?: string | null
          sharing_consent_version?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          alias_epoch: string
          created_at: string
          id: string
          leaderboard_anonymous: boolean
          name: string
          normalized_name: string
          owner_user_id: string
          revision: number
          status: Database["public"]["Enums"]["group_status"]
          timezone: string
          updated_at: string
        }
        Insert: {
          alias_epoch?: string
          created_at?: string
          id: string
          leaderboard_anonymous?: boolean
          name: string
          normalized_name: string
          owner_user_id: string
          revision?: number
          status?: Database["public"]["Enums"]["group_status"]
          timezone: string
          updated_at?: string
        }
        Update: {
          alias_epoch?: string
          created_at?: string
          id?: string
          leaderboard_anonymous?: boolean
          name?: string
          normalized_name?: string
          owner_user_id?: string
          revision?: number
          status?: Database["public"]["Enums"]["group_status"]
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          normalized_name: string
          revision: number
          status: Database["public"]["Enums"]["profile_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          normalized_name: string
          revision?: number
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          normalized_name?: string
          revision?: number
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
        }
        Relationships: []
      }
      salawat_entries: {
        Row: {
          amount: number
          created_at: string
          entry_date: string
          id: string
          recorded_at_client: string
          revision: number
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          entry_date: string
          id: string
          recorded_at_client: string
          revision?: number
          timezone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          entry_date?: string
          id?: string
          recorded_at_client?: string
          revision?: number
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          locale: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          locale: string
          timezone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          locale?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_group_invite: {
        Args: { p_kind: string; p_locale: string; p_secret: string }
        Returns: Json
      }
      create_entry: {
        Args: {
          p_amount: number
          p_entry_date: string
          p_id: string
          p_recorded_at_client: string
          p_timezone: string
        }
        Returns: Json
      }
      create_group: {
        Args: {
          p_client_group_id: string
          p_leaderboard_anonymous: boolean
          p_name: string
          p_rules_accepted: boolean
          p_timezone: string
        }
        Returns: Json
      }
      create_group_invite: {
        Args: {
          p_expires_in_days?: number
          p_group_id: string
          p_max_uses?: number
        }
        Returns: Json
      }
      delete_entry: {
        Args: { p_expected_revision: number; p_id: string }
        Returns: Json
      }
      get_entry: { Args: { p_id: string }; Returns: Json }
      get_group_leaderboard: {
        Args: {
          p_cursor_membership_id?: string
          p_cursor_normalized_name?: string
          p_cursor_rank?: number
          p_group_id: string
          p_limit?: number
          p_period: string
        }
        Returns: Json
      }
      get_home_summary: { Args: { p_timezone: string }; Returns: Json }
      get_onboarding_state: { Args: never; Returns: Json }
      grant_core_consent: { Args: { p_locale: string }; Returns: Json }
      list_entries: {
        Args: {
          p_cursor_created_at?: string
          p_cursor_entry_date?: string
          p_cursor_id?: string
          p_limit?: number
        }
        Returns: Json
      }
      list_group_invites: { Args: { p_group_id: string }; Returns: Json }
      list_my_groups: { Args: never; Returns: Json }
      preview_group_invite: {
        Args: { p_kind: string; p_secret: string }
        Returns: Json
      }
      revoke_group_invite: {
        Args: { p_group_id: string; p_invite_id: string }
        Returns: Json
      }
      set_daily_goal: {
        Args: { p_amount: number; p_effective_from: string }
        Returns: Json
      }
      set_group_leaderboard_anonymity: {
        Args: {
          p_anonymous: boolean
          p_expected_revision: number
          p_group_id: string
        }
        Returns: Json
      }
      update_entry: {
        Args: {
          p_amount: number
          p_entry_date: string
          p_expected_revision: number
          p_id: string
        }
        Returns: Json
      }
      update_group_name: {
        Args: {
          p_expected_revision: number
          p_group_id: string
          p_name: string
        }
        Returns: Json
      }
      upsert_my_profile: {
        Args: { p_display_name: string; p_locale: string; p_timezone: string }
        Returns: Json
      }
    }
    Enums: {
      group_status: "active" | "suspended"
      profile_status: "active" | "suspended"
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
      group_status: ["active", "suspended"],
      profile_status: ["active", "suspended"],
    },
  },
} as const
