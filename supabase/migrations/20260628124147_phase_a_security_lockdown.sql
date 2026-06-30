-- Phase A security lockdown of SECURITY DEFINER functions (from live advisor scan).

-- 1. The rate limiter trusts caller-supplied user_id + max_calls. It must ONLY be
--    callable server-side (service_role), never directly by signed-in or anon users.
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer) TO service_role;

-- 2. Invite-code lookup should require a signed-in user, not anon (prevents enumeration).
REVOKE EXECUTE ON FUNCTION public.get_squad_by_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_squad_by_invite(text) TO authenticated;
