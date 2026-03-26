
INSERT INTO storage.buckets (id, name, public) VALUES ('store-assets', 'store-assets', true);

CREATE POLICY "Anyone can view store assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'store-assets');

CREATE POLICY "Admins can upload store assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'store-assets' AND public.is_admin());

CREATE POLICY "Admins can update store assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'store-assets' AND public.is_admin());

CREATE POLICY "Admins can delete store assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'store-assets' AND public.is_admin());
