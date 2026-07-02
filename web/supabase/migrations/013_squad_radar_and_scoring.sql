-- Squad Radar Enhancements
ALTER TABLE public.squad_checkins 
ADD COLUMN IF NOT EXISTS lat double precision,
ADD COLUMN IF NOT EXISTS lng double precision,
ADD COLUMN IF NOT EXISTS privacy text DEFAULT 'abstract', -- 'exact', 'approximate', 'abstract', 'hidden'
ADD COLUMN IF NOT EXISTS mood text; -- e.g., 'high_energy', 'focused', 'tired'
