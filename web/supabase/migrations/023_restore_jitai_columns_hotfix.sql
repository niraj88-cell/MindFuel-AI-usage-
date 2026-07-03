-- 023_restore_jitai_columns_hotfix.sql — restore domain_logs.jitai_* columns that 022 dropped.
-- Applied via MCP 2026-07-03.
--
-- INCIDENT: 022 dropped domain_logs.jitai_fired / jitai_outcome, but the DEPLOYED /api/ingest still
-- INSERTs them. Every extension batch flush then failed ("column domain_logs.jitai_fired does not
-- exist" -> HTTP 500); the popup showed "satyashift.vercel.app is briefly unavailable" and attention
-- stopped persisting (queued locally in the extension, not lost). Root cause: a destructive schema
-- change was applied AHEAD of the code that stops depending on it — the wrong order.
--
-- FIX: restore the columns so the live code works again. They are domain-free and harmless (a boolean
-- + a short text), so keeping them costs nothing privacy-wise. The eventual DROP (if desired at all)
-- must be a LATER migration applied AFTER the ingest build that no longer writes them is deployed:
-- code-first, then DDL. The real privacy win of 022 — dropping the five legacy content/URL tables —
-- stands and is unaffected.
alter table public.domain_logs add column if not exists jitai_fired boolean not null default false;
alter table public.domain_logs add column if not exists jitai_outcome text;
