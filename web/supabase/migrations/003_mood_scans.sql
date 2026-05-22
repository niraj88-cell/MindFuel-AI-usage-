-- Migration: mood_scans table for 5-dimension mood intelligence analysis history
-- Run this in your Supabase SQL editor or via CLI

CREATE TABLE IF NOT EXISTS mood_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url TEXT,
  content TEXT,
  platform TEXT,
  emotional_valence JSONB,
  energy_signature JSONB,
  psychological_themes JSONB,
  mood_trajectory JSONB,
  consumption_risk JSONB,
  mood_verdict TEXT,
  recommended_action TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mood_scans_user ON mood_scans(user_id, created_at DESC);

ALTER TABLE mood_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scans"
  ON mood_scans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scans"
  ON mood_scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own scans"
  ON mood_scans FOR DELETE
  USING (auth.uid() = user_id);
