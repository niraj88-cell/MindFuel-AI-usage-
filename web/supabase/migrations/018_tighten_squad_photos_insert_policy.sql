-- 018: Enforce per-user folder scoping on squad photo uploads (APPLIED live 2026-07-02).
-- squad_photos had TWO permissive INSERT policies; because RLS ORs permissive policies,
-- the loose one ("any object name if you are the owner") overrode the folder-scoped one,
-- letting a hand-crafted request write outside the uploader's own folder. The SELECT
-- policy grants squad visibility from the first path segment, so an unconstrained path
-- also breaks that model. Keep only the own-folder INSERT policy; the app route
-- (app/api/squads/upload) writes to `${uid}/...`.
drop policy if exists "Authenticated users can upload squad photos" on storage.objects;
