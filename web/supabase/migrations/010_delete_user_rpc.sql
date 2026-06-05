-- Migration: Delete User RPC
-- Allows an authenticated user to delete their own account safely.

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete the user from auth.users (cascades to all other tables)
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
