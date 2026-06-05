-- Fix Infinite Recursion in Squads RLS Policies

-- 1. Drop the recursive policies
DROP POLICY IF EXISTS "Users can view squads they belong to" ON public.squads;
DROP POLICY IF EXISTS "Users can view members of their squads" ON public.squad_members;

-- 2. Create a SECURITY DEFINER function to bypass RLS for the membership check
CREATE OR REPLACE FUNCTION public.is_squad_member(check_squad_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.squad_members
    WHERE squad_id = check_squad_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate the policy for squads using the function
CREATE POLICY "Users can view squads they belong to" 
ON public.squads FOR SELECT 
USING (
    public.is_squad_member(id)
);

-- 4. Recreate the policy for squad_members using the function
CREATE POLICY "Users can view members of their squads"
ON public.squad_members FOR SELECT
USING (
    user_id = auth.uid() OR public.is_squad_member(squad_id)
);
