CREATE TABLE IF NOT EXISTS public.mood_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mood INTEGER NOT NULL CHECK (mood BETWEEN 1 AND 10),
    energy INTEGER CHECK (energy BETWEEN 1 AND 10),
    anxiety INTEGER CHECK (anxiety BETWEEN 1 AND 10),
    notes TEXT,
    context TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    action_items JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.habit_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    target_days INTEGER DEFAULT 7,
    completed_days INTEGER DEFAULT 0,
    difficulty TEXT DEFAULT 'medium',
    category TEXT NOT NULL,
    target_category TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coaching_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    state JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.mood_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own mood_logs" ON public.mood_logs;
CREATE POLICY "Users can manage own mood_logs" ON public.mood_logs FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own ai_insights" ON public.ai_insights;
CREATE POLICY "Users can manage own ai_insights" ON public.ai_insights FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own habit_challenges" ON public.habit_challenges;
CREATE POLICY "Users can manage own habit_challenges" ON public.habit_challenges FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own notifications" ON public.notifications;
CREATE POLICY "Users can manage own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own coaching_sessions" ON public.coaching_sessions;
CREATE POLICY "Users can manage own coaching_sessions" ON public.coaching_sessions FOR ALL USING (auth.uid() = user_id);
