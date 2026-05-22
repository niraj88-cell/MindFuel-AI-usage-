-- 20260522_audit_logs.sql
-- Insane Level Security: Immutable Audit Trail

-- 1. Create the hidden audit log table
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    user_id UUID,
    action TEXT NOT NULL CHECK (action IN ('UPDATE', 'DELETE')),
    old_data JSONB NOT NULL,
    new_data JSONB,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    client_ip TEXT,
    actor_id UUID
);

-- 2. Lock it down completely (NO API ACCESS)
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;
-- No policies created means absolutely nobody (except postgres role) can read/write this table via API.

-- 3. Create the generic trigger function
CREATE OR REPLACE FUNCTION public.log_security_audit_event()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.security_audit_logs (table_name, record_id, user_id, action, old_data, actor_id)
        VALUES (
            TG_TABLE_NAME, 
            OLD.id, 
            OLD.user_id, 
            'DELETE', 
            row_to_json(OLD)::jsonb,
            auth.uid()
        );
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.security_audit_logs (table_name, record_id, user_id, action, old_data, new_data, actor_id)
        VALUES (
            TG_TABLE_NAME, 
            NEW.id, 
            NEW.user_id, 
            'UPDATE', 
            row_to_json(OLD)::jsonb, 
            row_to_json(NEW)::jsonb,
            auth.uid()
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach triggers to highly sensitive tables
DROP TRIGGER IF EXISTS audit_mental_logs ON public.mental_logs;
CREATE TRIGGER audit_mental_logs
    AFTER UPDATE OR DELETE ON public.mental_logs
    FOR EACH ROW EXECUTE FUNCTION public.log_security_audit_event();

DROP TRIGGER IF EXISTS audit_profiles ON public.profiles;
CREATE TRIGGER audit_profiles
    AFTER UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.log_security_audit_event();

DROP TRIGGER IF EXISTS audit_coaching_sessions ON public.coaching_sessions;
CREATE TRIGGER audit_coaching_sessions
    AFTER UPDATE OR DELETE ON public.coaching_sessions
    FOR EACH ROW EXECUTE FUNCTION public.log_security_audit_event();
