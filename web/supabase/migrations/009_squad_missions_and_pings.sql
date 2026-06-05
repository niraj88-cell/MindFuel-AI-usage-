-- Squad Missions and Pings (Curated Interactions)

CREATE TABLE IF NOT EXISTS public.squad_missions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    squad_id uuid REFERENCES public.squads(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'focus', 'detox', 'sleep', 'steps'
    title text NOT NULL,
    target_value integer NOT NULL, -- e.g., 180 (minutes)
    status text DEFAULT 'active', -- 'active', 'completed', 'failed'
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.squad_mission_participants (
    mission_id uuid REFERENCES public.squad_missions(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    progress integer DEFAULT 0,
    completed boolean DEFAULT false,
    updated_at timestamptz DEFAULT now(),
    PRIMARY KEY (mission_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.squad_pings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    squad_id uuid REFERENCES public.squads(id) ON DELETE CASCADE,
    from_user uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    to_user uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    ping_type text NOT NULL, -- 'motivate', 'check-in', 'celebrate', 'focus-flame'
    created_at timestamptz DEFAULT now()
);

-- RLS for squad_missions
ALTER TABLE public.squad_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view missions for their squads"
ON public.squad_missions FOR SELECT
USING (public.is_squad_member(squad_id));

CREATE POLICY "Users can create missions for their squads"
ON public.squad_missions FOR INSERT
WITH CHECK (public.is_squad_member(squad_id));

-- RLS for squad_mission_participants
ALTER TABLE public.squad_mission_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view mission participants for their squads"
ON public.squad_mission_participants FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.squad_missions sm
        WHERE sm.id = squad_mission_participants.mission_id 
        AND public.is_squad_member(sm.squad_id)
    )
);

CREATE POLICY "Users can insert own participation"
ON public.squad_mission_participants FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participation"
ON public.squad_mission_participants FOR UPDATE
USING (auth.uid() = user_id);

-- RLS for squad_pings
ALTER TABLE public.squad_pings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pings in their squads"
ON public.squad_pings FOR SELECT
USING (public.is_squad_member(squad_id));

CREATE POLICY "Users can send pings to their squad members"
ON public.squad_pings FOR INSERT
WITH CHECK (
    auth.uid() = from_user 
    AND public.is_squad_member(squad_id)
);
