// lib/supabase/types.ts — Full TypeScript types for Supabase DB

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type ContentCategory =
  | 'educational'
  | 'productive'
  | 'creative'
  | 'social'
  | 'entertainment'
  | 'doomscroll'
  | 'neutral'

export type SubscriptionTier = 'free' | 'premium'
export type LogSource = 'manual' | 'auto_tracking' | 'url_submission'
export type InsightType = 'daily_coach' | 'content_swap' | 'mood_correlation' | 'recipe' | 'challenge' | 'behavioral_insight'
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard'
export type NotificationType = 'daily_coach' | 'swap_suggestion' | 'challenge' | 'streak'

export interface Database {
  public: {
    Tables: {

      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          subscription_tier: SubscriptionTier
          daily_log_limit: number
          created_at: string
          updated_at: string
          onboarding_completed: boolean
          content_love: string | null
          content_regret: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          // SatyaShift columns (live DB) — optional during the MindFuel→SatyaShift transition.
          coach_persona?: 'gentle' | 'direct' | 'brutal' | null
          jitai_threshold_minutes?: number | null
          timezone?: string | null
          deleted_at?: string | null
          onboarding_step?: number | null
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      mental_logs: {
        Row: {
          id: string
          user_id: string
          content: string
          category: ContentCategory
          mental_score: number
          duration_minutes: number
          mood_before: number | null
          mood_after: number | null
          source: LogSource
          metadata: Json | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['mental_logs']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['mental_logs']['Insert']>
        Relationships: [
          {
            foreignKeyName: "mental_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      daily_summaries: {
        Row: {
          id: string
          user_id: string
          date: string
          total_score: number
          average_score: number
          total_logs: number
          category_breakdown: Json
          streak_days: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['daily_summaries']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['daily_summaries']['Insert']>
        Relationships: [
          {
            foreignKeyName: "daily_summaries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      weekly_reports: {
        Row: {
          id: string
          user_id: string
          week_start_date: string
          week_data: Json
          generated_at: string
        }
        Insert: Omit<Database['public']['Tables']['weekly_reports']['Row'], 'id' | 'generated_at'> & {
          id?: string
          generated_at?: string
        }
        Update: Partial<Database['public']['Tables']['weekly_reports']['Insert']>
        Relationships: [
          {
            foreignKeyName: "weekly_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      mood_logs: {
        Row: {
          id: string
          user_id: string
          mood: number
          energy: number | null
          anxiety: number | null
          notes: string | null
          context: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['mood_logs']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['mood_logs']['Insert']>
        Relationships: [
          {
            foreignKeyName: "mood_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      ai_insights: {
        Row: {
          id: string
          user_id: string
          type: InsightType
          title: string
          body: string
          action_items: Json
          metadata: Json
          is_read: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['ai_insights']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['ai_insights']['Insert']>
        Relationships: [
          {
            foreignKeyName: "ai_insights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      habit_challenges: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          target_days: number
          completed_days: number
          difficulty: ChallengeDifficulty
          category: string
          target_category: string
          is_active: boolean
          started_at: string
          completed_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['habit_challenges']['Row'], 'id' | 'created_at' | 'started_at'> & {
          id?: string
          created_at?: string
          started_at?: string
        }
        Update: Partial<Database['public']['Tables']['habit_challenges']['Insert']>
        Relationships: [
          {
            foreignKeyName: "habit_challenges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          body: string
          type: NotificationType
          is_read: boolean
          metadata: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      coaching_sessions: {
        Row: {
          id: string
          user_id: string
          state: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['coaching_sessions']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['coaching_sessions']['Insert']>
        Relationships: [
          {
            foreignKeyName: "coaching_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['push_subscriptions']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['push_subscriptions']['Insert']>
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      focus_sessions: {
        Row: {
          id: string
          user_id: string
          // Legacy MindFuel columns (renamed to mf_* in the live DB). Kept required so
          // un-migrated MindFuel code compiles unchanged until Phase E retires it.
          duration_minutes: number
          completed: boolean
          created_at: string
          // SatyaShift proof-layer columns (current DB) — optional during the transition.
          mf_duration_minutes?: number
          mf_completed?: boolean
          squad_id?: string | null
          intention?: string | null
          status?: string
          duration_s?: number | null
          session_quality?: string | null
          distraction_pct?: number | null
        }
        Insert: Omit<Database['public']['Tables']['focus_sessions']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['focus_sessions']['Insert']>
        Relationships: []
      }
      daily_pulses: {
        Row: {
          id: string
          user_id: string
          date: string
          rating: number
          note: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['daily_pulses']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['daily_pulses']['Insert']>
        Relationships: []
      }
      intercept_logs: {
        Row: {
          id: string
          user_id: string
          intent: string
          emotion: string | null
          action: 'continued' | 'disconnected'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['intercept_logs']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['intercept_logs']['Insert']>
        Relationships: []
      }
      mood_scans: {
        Row: {
          id: string
          user_id: string
          url: string | null
          content: string
          platform: string | null
          emotional_valence: number
          energy_signature: string
          psychological_themes: string[]
          mood_trajectory: string
          consumption_risk: string
          mood_verdict: string
          recommended_action: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['mood_scans']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['mood_scans']['Insert']>
        Relationships: []
      }
      semantic_memories: {
        Row: {
          id: string
          user_id: string
          content: string
          embedding: any
          metadata: Json | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['semantic_memories']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['semantic_memories']['Insert']>
        Relationships: [
          {
            foreignKeyName: "semantic_memories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      biometric_logs: {
        Row: {
          id: string
          user_id: string
          provider: string
          sleep_score: number | null
          hrv: number | null
          readiness_score: number | null
          resting_heart_rate: number | null
          date: string
          metadata: Json | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['biometric_logs']['Row'], 'id' | 'created_at' | 'date'> & {
          id?: string
          date?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['biometric_logs']['Insert']>
        Relationships: [
          {
            foreignKeyName: "biometric_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      squads: {
        Row: {
          id: string
          name: string
          invite_code: string
          created_by: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['squads']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['squads']['Insert']>
        Relationships: [
          {
            foreignKeyName: "squads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      squad_members: {
        Row: {
          squad_id: string
          user_id: string
          joined_at: string
        }
        Insert: Omit<Database['public']['Tables']['squad_members']['Row'], 'joined_at'> & {
          joined_at?: string
        }
        Update: Partial<Database['public']['Tables']['squad_members']['Insert']>
        Relationships: [
          {
            foreignKeyName: "squad_members_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      squad_missions: {
        Row: {
          id: string
          squad_id: string
          type: string
          title: string
          target_value: number
          status: string
          created_at: string
          expires_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['squad_missions']['Row'], 'id' | 'created_at' | 'status'> & {
          id?: string
          created_at?: string
          status?: string
        }
        Update: Partial<Database['public']['Tables']['squad_missions']['Insert']>
        Relationships: [
          {
            foreignKeyName: "squad_missions_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          }
        ]
      }
      squad_mission_participants: {
        Row: {
          mission_id: string
          user_id: string
          progress: number
          completed: boolean
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['squad_mission_participants']['Row'], 'progress' | 'completed' | 'updated_at'> & {
          progress?: number
          completed?: boolean
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['squad_mission_participants']['Insert']>
        Relationships: [
          {
            foreignKeyName: "squad_mission_participants_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "squad_missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_mission_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      squad_pings: {
        Row: {
          id: string
          squad_id: string
          from_user: string
          to_user: string
          ping_type: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['squad_pings']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['squad_pings']['Insert']>
        Relationships: [
          {
            foreignKeyName: "squad_pings_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_pings_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_pings_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      domain_logs: {
        Row: {
          id: string
          user_id: string
          domain: string
          duration_s: number
          category: string
          batch_id: string | null
          jitai_fired: boolean
          jitai_outcome: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          domain: string
          duration_s: number
          category?: string
          batch_id?: string | null
          jitai_fired?: boolean
          jitai_outcome?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['domain_logs']['Insert']>
        Relationships: []
      }
      processed_batches: {
        Row: {
          id: string
          user_id: string
          row_count: number
          received_at: string
        }
        Insert: {
          id: string
          user_id: string
          row_count: number
          received_at?: string
        }
        Update: Partial<Database['public']['Tables']['processed_batches']['Insert']>
        Relationships: []
      }
      rate_limits: {
        Row: {
          user_id: string
          endpoint: string
          window_start: string
          count: number
        }
        Insert: {
          user_id: string
          endpoint: string
          window_start?: string
          count?: number
        }
        Update: Partial<Database['public']['Tables']['rate_limits']['Insert']>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_memories: {
        Args: {
          query_embedding: any
          match_threshold: number
          match_count: number
          p_user_id: string
        }
        Returns: {
          id: string
          content: string
          metadata: Json
          similarity: number
        }[]
      }
      check_rate_limit: {
        Args: {
          p_user_id: string
          p_endpoint: string
          p_max_calls: number
        }
        Returns: boolean
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

// Convenience row types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type MentalLog = Database['public']['Tables']['mental_logs']['Row']
export type DailySummary = Database['public']['Tables']['daily_summaries']['Row']
export type WeeklyReport = Database['public']['Tables']['weekly_reports']['Row']
export type MoodLog = Database['public']['Tables']['mood_logs']['Row']
export type AIInsight = Database['public']['Tables']['ai_insights']['Row']
export type HabitChallenge = Database['public']['Tables']['habit_challenges']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type CoachingSession = Database['public']['Tables']['coaching_sessions']['Row']
