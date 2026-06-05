-- 011_harden_squads.sql

-- 1. Harden squad_pings INSERT policy to ensure to_user is also in the squad
DROP POLICY IF EXISTS "Users can send pings to their squad members" ON public.squad_pings;

CREATE POLICY "Users can send pings to their squad members"
ON public.squad_pings FOR INSERT
WITH CHECK (
    auth.uid() = from_user 
    AND public.is_squad_member(squad_id)
    AND EXISTS (
        SELECT 1 FROM public.squad_members 
        WHERE squad_id = public.squad_pings.squad_id 
        AND user_id = public.squad_pings.to_user
    )
);

-- 2. Harden get_squad_by_invite RPC
CREATE OR REPLACE FUNCTION public.get_squad_by_invite(code text)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name FROM public.squads WHERE invite_code = upper(trim(code));
$$;

-- Revoke execute from public and grant to authenticated/anon if needed
REVOKE ALL ON FUNCTION public.get_squad_by_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_squad_by_invite(text) TO authenticated;

-- 3. Enable realtime for squad tables
-- Need to check if tables are already in publication to avoid errors, 
-- but doing it this way is standard for Supabase migrations.
ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_pings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_members;
