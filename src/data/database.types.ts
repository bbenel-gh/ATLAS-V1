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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          global_daily_ai_cap: number
          id: boolean
          public_signup_enabled: boolean
          signups_per_device_per_day: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          global_daily_ai_cap?: number
          id?: boolean
          public_signup_enabled?: boolean
          signups_per_device_per_day?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          global_daily_ai_cap?: number
          id?: boolean
          public_signup_enabled?: boolean
          signups_per_device_per_day?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          id: string
          join_code: string | null
          level: string
          name: string
          school_id: string | null
          teacher_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          join_code?: string | null
          level?: string
          name: string
          school_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          join_code?: string | null
          level?: string
          name?: string
          school_id?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          form_ref: string | null
          given_at: string
          id: string
          method: Database["public"]["Enums"]["consent_method"]
          pupil_id: string
          recorded_by: string | null
          withdrawn_at: string | null
        }
        Insert: {
          form_ref?: string | null
          given_at?: string
          id?: string
          method: Database["public"]["Enums"]["consent_method"]
          pupil_id: string
          recorded_by?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          form_ref?: string | null
          given_at?: string
          id?: string
          method?: Database["public"]["Enums"]["consent_method"]
          pupil_id?: string
          recorded_by?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consents_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "pupils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          interests: string[]
          overview_confusions: string[]
          overview_keywords: string[]
          playful_choices: Json
          pupil_id: string
          updated_at: string
        }
        Insert: {
          interests?: string[]
          overview_confusions?: string[]
          overview_keywords?: string[]
          playful_choices?: Json
          pupil_id: string
          updated_at?: string
        }
        Update: {
          interests?: string[]
          overview_confusions?: string[]
          overview_keywords?: string[]
          playful_choices?: Json
          pupil_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: true
            referencedRelation: "pupils"
            referencedColumns: ["id"]
          },
        ]
      }
      pupils: {
        Row: {
          ai_notice_seen_at: string | null
          class_id: string | null
          class_level: string
          code: string
          created_at: string
          display_name: string
          failed_pin_count: number
          id: string
          locked_until: string | null
          pin_hash: string | null
          school_given: string | null
          school_id: string | null
          signed_up_by: Database["public"]["Enums"]["pupil_source"]
          status: Database["public"]["Enums"]["pupil_status"]
          user_id: string | null
        }
        Insert: {
          ai_notice_seen_at?: string | null
          class_id?: string | null
          class_level?: string
          code: string
          created_at?: string
          display_name: string
          failed_pin_count?: number
          id?: string
          locked_until?: string | null
          pin_hash?: string | null
          school_given?: string | null
          school_id?: string | null
          signed_up_by: Database["public"]["Enums"]["pupil_source"]
          status?: Database["public"]["Enums"]["pupil_status"]
          user_id?: string | null
        }
        Update: {
          ai_notice_seen_at?: string | null
          class_id?: string | null
          class_level?: string
          code?: string
          created_at?: string
          display_name?: string
          failed_pin_count?: number
          id?: string
          locked_until?: string | null
          pin_hash?: string | null
          school_given?: string | null
          school_id?: string | null
          signed_up_by?: Database["public"]["Enums"]["pupil_source"]
          status?: Database["public"]["Enums"]["pupil_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pupils_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pupils_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          added_by: string | null
          created_at: string
          district: string | null
          id: string
          name: string
          region: string | null
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          district?: string | null
          id?: string
          name: string
          region?: string | null
        }
        Update: {
          added_by?: string | null
          created_at?: string
          district?: string | null
          id?: string
          name?: string
          region?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schools_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string
          display_name: string
          id: string
          role: Database["public"]["Enums"]["staff_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          role: Database["public"]["Enums"]["staff_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          role?: Database["public"]["Enums"]["staff_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_pupil_class_id: { Args: never; Returns: string }
      current_pupil_id: { Args: never; Returns: string }
      current_pupil_school_id: { Args: never; Returns: string }
      current_staff_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_teacher_of: { Args: { p_class_id: string }; Returns: boolean }
      is_teacher_of_pupil: { Args: { p_pupil_id: string }; Returns: boolean }
      public_signup_enabled: { Args: never; Returns: boolean }
    }
    Enums: {
      consent_method: "paper" | "in_app"
      pupil_source: "self" | "admin"
      pupil_status: "active" | "suspended"
      staff_role: "admin" | "teacher"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      consent_method: ["paper", "in_app"],
      pupil_source: ["self", "admin"],
      pupil_status: ["active", "suspended"],
      staff_role: ["admin", "teacher"],
    },
  },
} as const
