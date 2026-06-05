-- Create squads table
CREATE TABLE IF NOT EXISTS public.squads (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    invite_code text UNIQUE NOT NULL,
    created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now()
);

-- Create squad members table
-- Note: referencing public.profiles(id) allows for easy joining in PostgREST queries
CREATE TABLE IF NOT EXISTS public.squad_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    squad_id uuid REFERENCES public.squads(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at timestamptz DEFAULT now(),
    UNIQUE(squad_id, user_id)
);

-- Enable RLS
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;

-- Squads Policies
-- Users can view squads they are a member of
CREATE POLICY "Users can view squads they belong to" 
ON public.squads FOR SELECT 
USING (
    id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid())
);

-- Authenticated users can insert (create) squads
CREATE POLICY "Authenticated users can create squads"
ON public.squads FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Squad Members Policies
-- Users can view members of squads they are part of
CREATE POLICY "Users can view members of their squads"
ON public.squad_members FOR SELECT
USING (
    squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid())
);

-- Users can insert themselves into a squad (joining)
CREATE POLICY "Users can join squads"
ON public.squad_members FOR INSERT
WITH CHECK (auth.uid() = user_id);
