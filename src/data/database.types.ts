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
  public: {
    Tables: {
      ai_calls: {
        Row: {
          created_at: string
          id: number
          input: Json | null
          job: Database["public"]["Enums"]["ai_job"]
          latency_ms: number | null
          model: string
          ok: boolean
          output: Json | null
          pupil_id: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          input?: Json | null
          job: Database["public"]["Enums"]["ai_job"]
          latency_ms?: number | null
          model: string
          ok: boolean
          output?: Json | null
          pupil_id?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          input?: Json | null
          job?: Database["public"]["Enums"]["ai_job"]
          latency_ms?: number | null
          model?: string
          ok?: boolean
          output?: Json | null
          pupil_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_calls_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "pupils"
            referencedColumns: ["id"]
          },
        ]
      }
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
      attempts: {
        Row: {
          ai_fallback: boolean
          answer: string | null
          answer_verdict: Database["public"]["Enums"]["ai_verdict"] | null
          changed_answer: boolean
          check_item_id: string | null
          client_created_at: string | null
          created_at: string
          id: string
          input_mode: Database["public"]["Enums"]["input_mode"]
          misconception_codes: string[]
          pupil_id: string
          read_back: string | null
          read_back_confirmed: boolean | null
          reason: string | null
          reason_input_mode: Database["public"]["Enums"]["input_mode"] | null
          reasoning_verdict: Database["public"]["Enums"]["ai_verdict"] | null
          segment_id: string
          sure: boolean | null
          time_taken_ms: number | null
          try_number: number
          video_version_id: string | null
        }
        Insert: {
          ai_fallback?: boolean
          answer?: string | null
          answer_verdict?: Database["public"]["Enums"]["ai_verdict"] | null
          changed_answer?: boolean
          check_item_id?: string | null
          client_created_at?: string | null
          created_at?: string
          id?: string
          input_mode: Database["public"]["Enums"]["input_mode"]
          misconception_codes?: string[]
          pupil_id: string
          read_back?: string | null
          read_back_confirmed?: boolean | null
          reason?: string | null
          reason_input_mode?: Database["public"]["Enums"]["input_mode"] | null
          reasoning_verdict?: Database["public"]["Enums"]["ai_verdict"] | null
          segment_id: string
          sure?: boolean | null
          time_taken_ms?: number | null
          try_number: number
          video_version_id?: string | null
        }
        Update: {
          ai_fallback?: boolean
          answer?: string | null
          answer_verdict?: Database["public"]["Enums"]["ai_verdict"] | null
          changed_answer?: boolean
          check_item_id?: string | null
          client_created_at?: string | null
          created_at?: string
          id?: string
          input_mode?: Database["public"]["Enums"]["input_mode"]
          misconception_codes?: string[]
          pupil_id?: string
          read_back?: string | null
          read_back_confirmed?: boolean | null
          reason?: string | null
          reason_input_mode?: Database["public"]["Enums"]["input_mode"] | null
          reasoning_verdict?: Database["public"]["Enums"]["ai_verdict"] | null
          segment_id?: string
          sure?: boolean | null
          time_taken_ms?: number | null
          try_number?: number
          video_version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attempts_check_item_id_fkey"
            columns: ["check_item_id"]
            isOneToOne: false
            referencedRelation: "check_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "pupils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_video_version_id_fkey"
            columns: ["video_version_id"]
            isOneToOne: false
            referencedRelation: "video_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      check_items: {
        Row: {
          accepted_answers: string[]
          created_at: string
          id: string
          misconception_codes: string[]
          question: string
          reason_options: Json
          reference_reasoning: string
          segment_id: string
          tap_options: Json
          try_number: number
        }
        Insert: {
          accepted_answers?: string[]
          created_at?: string
          id?: string
          misconception_codes?: string[]
          question: string
          reason_options?: Json
          reference_reasoning?: string
          segment_id: string
          tap_options?: Json
          try_number: number
        }
        Update: {
          accepted_answers?: string[]
          created_at?: string
          id?: string
          misconception_codes?: string[]
          question?: string
          reason_options?: Json
          reference_reasoning?: string
          segment_id?: string
          tap_options?: Json
          try_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "check_items_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      class_topics: {
        Row: {
          class_id: string
          set_at: string
          set_by: string | null
          topic_id: string
        }
        Insert: {
          class_id: string
          set_at?: string
          set_by?: string | null
          topic_id: string
        }
        Update: {
          class_id?: string
          set_at?: string
          set_by?: string | null
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_topics_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_topics_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
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
      exam_answers: {
        Row: {
          ai_notes: Json | null
          answer: string | null
          answer_option: number | null
          approved_at: string | null
          approved_by: string | null
          attempt_id: string
          borderline: boolean
          created_at: string
          id: string
          item_id: string
          marks_awarded: number | null
          pupil_id: string
          updated_at: string
        }
        Insert: {
          ai_notes?: Json | null
          answer?: string | null
          answer_option?: number | null
          approved_at?: string | null
          approved_by?: string | null
          attempt_id: string
          borderline?: boolean
          created_at?: string
          id?: string
          item_id: string
          marks_awarded?: number | null
          pupil_id: string
          updated_at?: string
        }
        Update: {
          ai_notes?: Json | null
          answer?: string | null
          answer_option?: number | null
          approved_at?: string | null
          approved_by?: string | null
          attempt_id?: string
          borderline?: boolean
          created_at?: string
          id?: string
          item_id?: string
          marks_awarded?: number | null
          pupil_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_answers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_answers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "exam_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_answers_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "pupils"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          auto_submitted: boolean
          created_at: string
          duration_seconds: number
          id: string
          max_score: number | null
          paper_id: string
          pupil_id: string
          score: number | null
          started_at: string
          status: Database["public"]["Enums"]["exam_attempt_status"]
          submitted_at: string | null
        }
        Insert: {
          auto_submitted?: boolean
          created_at?: string
          duration_seconds?: number
          id?: string
          max_score?: number | null
          paper_id: string
          pupil_id: string
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["exam_attempt_status"]
          submitted_at?: string | null
        }
        Update: {
          auto_submitted?: boolean
          created_at?: string
          duration_seconds?: number
          id?: string
          max_score?: number | null
          paper_id?: string
          pupil_id?: string
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["exam_attempt_status"]
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "exam_papers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempts_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "pupils"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_item_keys: {
        Row: {
          correct_option: number | null
          item_id: string
          scheme_points: Json | null
          suggested_answer: string
        }
        Insert: {
          correct_option?: number | null
          item_id: string
          scheme_points?: Json | null
          suggested_answer?: string
        }
        Update: {
          correct_option?: number | null
          item_id?: string
          scheme_points?: Json | null
          suggested_answer?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_item_keys_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "exam_items"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_items: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["exam_item_kind"]
          marks: number
          options: Json | null
          paper_id: string
          question: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["exam_item_kind"]
          marks: number
          options?: Json | null
          paper_id: string
          question: string
          sort_order: number
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["exam_item_kind"]
          marks?: number
          options?: Json | null
          paper_id?: string
          question?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_items_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "exam_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_papers: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          label: string
          topic_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes: number
          id?: string
          label: string
          topic_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          label?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_papers_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      flags: {
        Row: {
          admin_action: Database["public"]["Enums"]["flag_action"] | null
          attempt_id: string | null
          cleared_at: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          exam_answer_id: string | null
          id: string
          kind: Database["public"]["Enums"]["flag_kind"]
          note: string | null
          pupil_id: string
          segment_id: string | null
        }
        Insert: {
          admin_action?: Database["public"]["Enums"]["flag_action"] | null
          attempt_id?: string | null
          cleared_at?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          exam_answer_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["flag_kind"]
          note?: string | null
          pupil_id: string
          segment_id?: string | null
        }
        Update: {
          admin_action?: Database["public"]["Enums"]["flag_action"] | null
          attempt_id?: string | null
          cleared_at?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          exam_answer_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["flag_kind"]
          note?: string | null
          pupil_id?: string
          segment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flags_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flags_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flags_exam_answer_id_fkey"
            columns: ["exam_answer_id"]
            isOneToOne: false
            referencedRelation: "exam_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flags_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "pupils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flags_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      mastery: {
        Row: {
          achieved_at: string | null
          exam_attempt_id: string | null
          exam_score: number | null
          id: string
          missed_segment_ids: string[]
          pupil_id: string
          recheck_done_at: string | null
          recheck_due_at: string | null
          recheck_result: Database["public"]["Enums"]["recheck_result"] | null
          status: Database["public"]["Enums"]["mastery_status"]
          topic_id: string
          updated_at: string
        }
        Insert: {
          achieved_at?: string | null
          exam_attempt_id?: string | null
          exam_score?: number | null
          id?: string
          missed_segment_ids?: string[]
          pupil_id: string
          recheck_done_at?: string | null
          recheck_due_at?: string | null
          recheck_result?: Database["public"]["Enums"]["recheck_result"] | null
          status: Database["public"]["Enums"]["mastery_status"]
          topic_id: string
          updated_at?: string
        }
        Update: {
          achieved_at?: string | null
          exam_attempt_id?: string | null
          exam_score?: number | null
          id?: string
          missed_segment_ids?: string[]
          pupil_id?: string
          recheck_done_at?: string | null
          recheck_due_at?: string | null
          recheck_result?: Database["public"]["Enums"]["recheck_result"] | null
          status?: Database["public"]["Enums"]["mastery_status"]
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mastery_exam_attempt_id_fkey"
            columns: ["exam_attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mastery_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "pupils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mastery_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      overview_responses: {
        Row: {
          ai_result: Json | null
          client_created_at: string | null
          confusing_text: string | null
          created_at: string
          id: string
          pupil_id: string
          skipped: boolean
          summary_text: string | null
          topic_id: string
        }
        Insert: {
          ai_result?: Json | null
          client_created_at?: string | null
          confusing_text?: string | null
          created_at?: string
          id?: string
          pupil_id: string
          skipped?: boolean
          summary_text?: string | null
          topic_id: string
        }
        Update: {
          ai_result?: Json | null
          client_created_at?: string | null
          confusing_text?: string | null
          created_at?: string
          id?: string
          pupil_id?: string
          skipped?: boolean
          summary_text?: string | null
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "overview_responses_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "pupils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overview_responses_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          interests: string[]
          onboarded_at: string | null
          onboarding: Json
          overview_confusions: string[]
          overview_keywords: string[]
          playful_choices: Json
          pupil_id: string
          updated_at: string
        }
        Insert: {
          interests?: string[]
          onboarded_at?: string | null
          onboarding?: Json
          overview_confusions?: string[]
          overview_keywords?: string[]
          playful_choices?: Json
          pupil_id: string
          updated_at?: string
        }
        Update: {
          interests?: string[]
          onboarded_at?: string | null
          onboarding?: Json
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
      recheck_items: {
        Row: {
          accepted_answers: string[]
          created_at: string
          id: string
          question: string
          segment_id: string
          sort_order: number
          tap_options: Json
          topic_id: string
        }
        Insert: {
          accepted_answers?: string[]
          created_at?: string
          id?: string
          question: string
          segment_id: string
          sort_order: number
          tap_options?: Json
          topic_id: string
        }
        Update: {
          accepted_answers?: string[]
          created_at?: string
          id?: string
          question?: string
          segment_id?: string
          sort_order?: number
          tap_options?: Json
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recheck_items_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recheck_items_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
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
      segment_status: {
        Row: {
          pupil_id: string
          segment_id: string
          status: Database["public"]["Enums"]["segment_state"]
          tries_used: number
          updated_at: string
          versions_seen: string[]
        }
        Insert: {
          pupil_id: string
          segment_id: string
          status?: Database["public"]["Enums"]["segment_state"]
          tries_used?: number
          updated_at?: string
          versions_seen?: string[]
        }
        Update: {
          pupil_id?: string
          segment_id?: string
          status?: Database["public"]["Enums"]["segment_state"]
          tries_used?: number
          updated_at?: string
          versions_seen?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "segment_status_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "pupils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segment_status_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      segments: {
        Row: {
          code: string
          created_at: string
          id: string
          misconceptions: Json
          objective: string
          reference_meaning: string
          sort_order: number
          title: string
          topic_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          misconceptions?: Json
          objective?: string
          reference_meaning?: string
          sort_order: number
          title: string
          topic_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          misconceptions?: Json
          objective?: string
          reference_meaning?: string
          sort_order?: number
          title?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "segments_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      signin_rate: {
        Row: {
          hits: number
          key: string
          minute: string
        }
        Insert: {
          hits?: number
          key: string
          minute: string
        }
        Update: {
          hits?: number
          key?: string
          minute?: string
        }
        Relationships: []
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
      topics: {
        Row: {
          class_level: string
          code: string
          content_version: string | null
          created_at: string
          id: string
          prerequisites: string[]
          subject: string
          title: string
        }
        Insert: {
          class_level: string
          code: string
          content_version?: string | null
          created_at?: string
          id?: string
          prerequisites?: string[]
          subject: string
          title: string
        }
        Update: {
          class_level?: string
          code?: string
          content_version?: string | null
          created_at?: string
          id?: string
          prerequisites?: string[]
          subject?: string
          title?: string
        }
        Relationships: []
      }
      video_versions: {
        Row: {
          board_colour: string
          captions_url: string | null
          created_at: string
          duration_seconds: number
          example_world: string
          id: string
          interest_tags: string[]
          label: string
          misconception_tags: string[]
          poster_url: string | null
          segment_id: string
          url_1080: string | null
          url_360: string
          url_480: string
          url_720: string | null
        }
        Insert: {
          board_colour?: string
          captions_url?: string | null
          created_at?: string
          duration_seconds: number
          example_world?: string
          id?: string
          interest_tags?: string[]
          label: string
          misconception_tags?: string[]
          poster_url?: string | null
          segment_id: string
          url_1080?: string | null
          url_360: string
          url_480: string
          url_720?: string | null
        }
        Update: {
          board_colour?: string
          captions_url?: string | null
          created_at?: string
          duration_seconds?: number
          example_world?: string
          id?: string
          interest_tags?: string[]
          label?: string
          misconception_tags?: string[]
          poster_url?: string | null
          segment_id?: string
          url_1080?: string | null
          url_360?: string
          url_480?: string
          url_720?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_versions_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      worked_examples: {
        Row: {
          body: string
          created_at: string
          id: string
          image_url: string | null
          segment_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          image_url?: string | null
          segment_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          segment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worked_examples_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: true
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_answer_exam_item: {
        Args: { p_attempt_id: string; p_item_id: string }
        Returns: boolean
      }
      check_pupil_pin: {
        Args: { p_pin: string; p_pupil_id: string }
        Returns: {
          failed_count: number
          ok: boolean
        }[]
      }
      current_pupil_class_id: { Args: never; Returns: string }
      current_pupil_id: { Args: never; Returns: string }
      current_pupil_school_id: { Args: never; Returns: string }
      current_staff_id: { Args: never; Returns: string }
      get_exam_items: {
        Args: { p_attempt_id: string }
        Returns: {
          id: string
          kind: Database["public"]["Enums"]["exam_item_kind"]
          marks: number
          options: Json
          question: string
          sort_order: number
        }[]
      }
      get_exam_review: {
        Args: { p_attempt_id: string }
        Returns: {
          correct_option: number
          item_id: string
          scheme_points: Json
          suggested_answer: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_signed_in_user: { Args: never; Returns: boolean }
      is_teacher_of: { Args: { p_class_id: string }; Returns: boolean }
      is_teacher_of_pupil: { Args: { p_pupil_id: string }; Returns: boolean }
      link_pupil_user: {
        Args: { p_pupil_id: string; p_user_id: string }
        Returns: boolean
      }
      lock_pupil: {
        Args: { p_pupil_id: string; p_until: string }
        Returns: undefined
      }
      public_signup_enabled: { Args: never; Returns: boolean }
      pupil_signin_lookup: {
        Args: { p_code: string }
        Returns: {
          has_pin: boolean
          locked_until: string
          pupil_id: string
          status: Database["public"]["Enums"]["pupil_status"]
          user_id: string
        }[]
      }
      set_pupil_pin: {
        Args: { p_pin: string; p_pupil_id: string }
        Returns: boolean
      }
      signin_rate_hit: {
        Args: { p_key: string; p_limit: number; p_minute: string }
        Returns: boolean
      }
    }
    Enums: {
      ai_job: "overview" | "check" | "mark_theory" | "read_handwriting"
      ai_verdict: "yes" | "no" | "unsure"
      consent_method: "paper" | "in_app"
      exam_attempt_status: "in_progress" | "submitted" | "marked"
      exam_item_kind: "objective" | "theory"
      flag_action: "content_fix" | "human_help"
      flag_kind: "stalled" | "borderline" | "safeguarding"
      input_mode: "typed" | "tap" | "handwriting"
      mastery_status: "achieved" | "confirmed" | "revision"
      pupil_source: "self" | "admin"
      pupil_status: "active" | "suspended"
      recheck_result: "pass" | "miss"
      segment_state: "not_started" | "in_progress" | "complete" | "moved_on"
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
  public: {
    Enums: {
      ai_job: ["overview", "check", "mark_theory", "read_handwriting"],
      ai_verdict: ["yes", "no", "unsure"],
      consent_method: ["paper", "in_app"],
      exam_attempt_status: ["in_progress", "submitted", "marked"],
      exam_item_kind: ["objective", "theory"],
      flag_action: ["content_fix", "human_help"],
      flag_kind: ["stalled", "borderline", "safeguarding"],
      input_mode: ["typed", "tap", "handwriting"],
      mastery_status: ["achieved", "confirmed", "revision"],
      pupil_source: ["self", "admin"],
      pupil_status: ["active", "suspended"],
      recheck_result: ["pass", "miss"],
      segment_state: ["not_started", "in_progress", "complete", "moved_on"],
      staff_role: ["admin", "teacher"],
    },
  },
} as const
