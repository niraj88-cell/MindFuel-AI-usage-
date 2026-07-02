-- Create the squad_photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('squad_photos', 'squad_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for squad_photos
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'squad_photos' );

CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'squad_photos'
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update own photos"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'squad_photos'
    AND auth.uid() = owner
);

CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'squad_photos'
    AND auth.uid() = owner
);
