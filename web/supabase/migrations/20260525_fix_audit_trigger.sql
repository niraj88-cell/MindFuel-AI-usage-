-- 20260525_fix_audit_trigger.sql

CREATE OR REPLACE FUNCTION public.log_security_audit_event()
RETURNS TRIGGER AS $$
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
        VALUES (
            TG_TABLE_NAME, 
            OLD.id, 
            v_user_id, 
            'DELETE', 
            row_to_json(OLD)::jsonb,
            auth.uid()
        );
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (TG_TABLE_NAME = 'profiles') THEN
            v_user_id := NEW.id;
        ELSE
            v_user_id := NEW.user_id;
        END IF;

        INSERT INTO public.security_audit_logs (table_name, record_id, user_id, action, old_data, new_data, actor_id)
        VALUES (
            TG_TABLE_NAME, 
            NEW.id, 
            v_user_id, 
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
