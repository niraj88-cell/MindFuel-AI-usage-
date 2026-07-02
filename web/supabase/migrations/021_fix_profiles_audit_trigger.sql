-- 021: fix the profiles audit trigger (live bug found while smoke-testing billing).
-- profiles has no user_id column (its PK is id). The LIVE log_security_audit_event()
-- still carried the pre-fix body (COALESCE(OLD.user_id, NEW.user_id)), so every UPDATE
-- or DELETE on profiles raised 42703 — the repo's 20260525_fix_audit_trigger.sql was
-- written but never applied to the live database. This is that fix, applied for real,
-- hardened with an explicit search_path and to_jsonb.
CREATE OR REPLACE FUNCTION public.log_security_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        IF (TG_TABLE_NAME = 'profiles') THEN
            v_user_id := OLD.id;
        ELSE
            v_user_id := OLD.user_id;
        END IF;

        INSERT INTO public.security_audit_logs (table_name, record_id, user_id, action, old_data, actor_id)
        VALUES (TG_TABLE_NAME, OLD.id, v_user_id, 'DELETE', to_jsonb(OLD), (SELECT auth.uid()));
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (TG_TABLE_NAME = 'profiles') THEN
            v_user_id := NEW.id;
        ELSE
            v_user_id := NEW.user_id;
        END IF;

        INSERT INTO public.security_audit_logs (table_name, record_id, user_id, action, old_data, new_data, actor_id)
        VALUES (TG_TABLE_NAME, NEW.id, v_user_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), (SELECT auth.uid()));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;
