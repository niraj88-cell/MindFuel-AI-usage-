-- Function to safely lookup a squad by its invite code without exposing all squads to RLS
CREATE OR REPLACE FUNCTION public.get_squad_by_invite(code text)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, name FROM public.squads WHERE invite_code = code;
$$;
