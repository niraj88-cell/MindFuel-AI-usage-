-- 017: Least privilege on squad membership helpers (APPLIED live 2026-07-02).
-- is_squad_member / is_squad_admin are SECURITY DEFINER helpers used inside RLS policies.
-- anon has no legitimate path to squad data, so it must not be able to call them directly
-- via /rest/v1/rpc. authenticated keeps EXECUTE: RLS evaluates these in the authenticated
-- role's context, and the admin/member flows call them.
revoke execute on function public.is_squad_admin(uuid) from anon;
revoke execute on function public.is_squad_admin(uuid) from public;
revoke execute on function public.is_squad_member(uuid) from anon;
revoke execute on function public.is_squad_member(uuid) from public;
