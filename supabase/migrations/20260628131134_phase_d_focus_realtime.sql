-- Phase D: stream the proof layer. Add focus_sessions to the realtime publication
-- (idempotent — only adds if not already a member).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'focus_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.focus_sessions;
  END IF;
END $$;
