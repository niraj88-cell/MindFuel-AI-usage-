-- Create Squad Check-ins Table
CREATE TABLE IF NOT EXISTS public.squad_checkins (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    squad_id uuid REFERENCES public.squads(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    activity text NOT NULL,
    location text,
    note text,
    photo_url text,
    created_at timestamptz DEFAULT now()
);

-- Create Squad Check-in Reactions Table
CREATE TABLE IF NOT EXISTS public.squad_checkin_reactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    checkin_id uuid REFERENCES public.squad_checkins(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    reaction_type text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(checkin_id, user_id, reaction_type)
);

-- Enable RLS
ALTER TABLE public.squad_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_checkin_reactions ENABLE ROW LEVEL SECURITY;

-- Squad Check-ins Policies
CREATE POLICY "Users can view checkins for their squads"
ON public.squad_checkins FOR SELECT
USING (public.is_squad_member(squad_id));

CREATE POLICY "Users can insert own checkins"
ON public.squad_checkins FOR INSERT
WITH CHECK (
    auth.uid() = user_id 
    AND public.is_squad_member(squad_id)
);

-- Squad Check-in Reactions Policies
CREATE POLICY "Users can view reactions for checkins in their squads"
ON public.squad_checkin_reactions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.squad_checkins sc
        WHERE sc.id = squad_checkin_reactions.checkin_id 
        AND public.is_squad_member(sc.squad_id)
    )
);

CREATE POLICY "Users can insert own reactions"
ON public.squad_checkin_reactions FOR INSERT
WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
        SELECT 1 FROM public.squad_checkins sc
        WHERE sc.id = checkin_id 
        AND public.is_squad_member(sc.squad_id)
    )
);

CREATE POLICY "Users can delete own reactions"
ON public.squad_checkin_reactions FOR DELETE
USING (auth.uid() = user_id);
