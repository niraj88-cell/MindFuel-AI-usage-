-- Phase E (MindFuel farewell): lock the report-generator functions to server-side only.
-- No app code calls these via RPC; this closes the "authenticated can execute SECURITY
-- DEFINER" advisor warnings without affecting any feature.
REVOKE EXECUTE ON FUNCTION public.calculate_daily_summary(date, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_daily_summary(date, uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.generate_weekly_report(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_weekly_report(date) TO service_role;
