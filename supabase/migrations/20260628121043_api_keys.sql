-- 016_api_keys.sql
-- Real API key authentication for the extension / mobile passive-ingest endpoints.
-- Keys are NEVER stored in plaintext. We store a SHA-256 hash of the full key
-- and a short non-secret prefix so users can recognize a key in a settings UI.

CREATE TABLE IF NOT EXISTS public.api_keys (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    key_hash text UNIQUE NOT NULL,         -- SHA-256 hex of the full key (lookup target)
    key_prefix text NOT NULL,              -- e.g. 'mf_live_a1b2c3' — safe to display
    name text,                             -- human label, e.g. "Chrome Extension"
    last_used_at timestamptz,
    revoked boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Fast lookups when listing a user's keys
CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON public.api_keys(user_id);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Users can view their own keys (to manage them later in a settings page)
CREATE POLICY "Users can view their own api keys"
ON public.api_keys FOR SELECT
USING (auth.uid() = user_id);

-- Users can create keys for themselves
CREATE POLICY "Users can create their own api keys"
ON public.api_keys FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can revoke/delete their own keys
CREATE POLICY "Users can delete their own api keys"
ON public.api_keys FOR DELETE
USING (auth.uid() = user_id);
