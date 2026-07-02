-- Allow users to view the profiles of other members in the same squad
CREATE POLICY "Users can view squad members profiles"
ON public.profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 
        FROM public.squad_members sm_me 
        JOIN public.squad_members sm_other ON sm_me.squad_id = sm_other.squad_id 
        WHERE sm_me.user_id = auth.uid() AND sm_other.user_id = profiles.id
    )
);
