-- Fix the SELECT policy on squads so the creator can read the squad immediately after inserting it
-- (before they are added to squad_members)

DROP POLICY IF EXISTS "Users can view squads they belong to" ON public.squads;

CREATE POLICY "Users can view squads they belong to or created" 
ON public.squads FOR SELECT 
USING (
    created_by = auth.uid() OR public.is_squad_member(id)
);
