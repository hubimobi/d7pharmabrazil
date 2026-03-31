
-- 2. Fix orders realtime PII leak: Remove orders from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.orders;
