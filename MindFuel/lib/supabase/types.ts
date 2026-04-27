// lib/supabase/types.ts — Full TypeScript types for Supabase DB (Mobile)

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
export type InsightType = 'daily_coach' | 'content_swap' | 'mood_correlation' | 'recipe' | 'challenge'
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
