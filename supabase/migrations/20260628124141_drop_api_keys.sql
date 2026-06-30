-- Reverting C2: SatyaShift uses Supabase JWT for the extension, not API keys.
DROP TABLE IF EXISTS public.api_keys;
