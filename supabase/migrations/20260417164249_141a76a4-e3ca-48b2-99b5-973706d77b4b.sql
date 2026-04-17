-- Tenant-scoped storage policies for product-images, store-assets, images buckets.
-- Path convention: {tenant_id}/...  (first folder = tenant uuid)
-- Legacy files (no tenant prefix) remain publicly readable for backward compat.

-- Drop any prior tenant-scoped policies (idempotent)
DROP POLICY IF EXISTS "tenant_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "tenant_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "tenant_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "tenant_storage_delete" ON storage.objects;

-- SELECT: public buckets remain readable by everyone (no change here);
-- this policy ALLOWS authenticated users to also list within their tenant folder.
CREATE POLICY "tenant_storage_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id IN ('product-images', 'store-assets', 'images')
  AND (
    public.is_super_admin(auth.uid())
    OR (storage.foldername(name))[1]::uuid = ANY(public.get_user_tenant_ids())
    OR (storage.foldername(name))[1] !~ '^[0-9a-f-]{36}$'  -- legacy files (no tenant prefix)
  )
);

-- INSERT: must be inside own tenant folder (or super_admin)
CREATE POLICY "tenant_storage_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('product-images', 'store-assets', 'images')
  AND (
    public.is_super_admin(auth.uid())
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      AND (storage.foldername(name))[1]::uuid = ANY(public.get_user_tenant_ids())
    )
  )
);

-- UPDATE: only own tenant folder
CREATE POLICY "tenant_storage_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id IN ('product-images', 'store-assets', 'images')
  AND (
    public.is_super_admin(auth.uid())
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      AND (storage.foldername(name))[1]::uuid = ANY(public.get_user_tenant_ids())
    )
  )
)
WITH CHECK (
  bucket_id IN ('product-images', 'store-assets', 'images')
  AND (
    public.is_super_admin(auth.uid())
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      AND (storage.foldername(name))[1]::uuid = ANY(public.get_user_tenant_ids())
    )
  )
);

-- DELETE: only own tenant folder
CREATE POLICY "tenant_storage_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id IN ('product-images', 'store-assets', 'images')
  AND (
    public.is_super_admin(auth.uid())
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      AND (storage.foldername(name))[1]::uuid = ANY(public.get_user_tenant_ids())
    )
  )
);