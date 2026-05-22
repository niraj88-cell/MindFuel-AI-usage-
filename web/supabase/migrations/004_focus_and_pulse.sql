-- Migration: Focus Sessions + Daily Pulses tables
-- Run this in your Supabase SQL editor

-- Focus Timer sessions
CREATE TABLE IF NOT EXISTS focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user ON focus_sessions(user_id, created_at DESC);

ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own focus sessions"
  ON focus_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own focus sessions"
  ON focus_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Daily Pulse check-ins
CREATE TABLE IF NOT EXISTS daily_pulses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_pulses_user ON daily_pulses(user_id, date DESC);

ALTER TABLE daily_pulses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pulses"
  ON daily_pulses FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pulses"
  ON daily_pulses FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pulses"
  ON daily_pulses FOR UPDATE USING (auth.uid() = user_id);
