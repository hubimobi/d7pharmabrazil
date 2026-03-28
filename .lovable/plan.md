

## Fix: RLS Policy Always True

### Problem
Two tables have overly permissive INSERT policies using `WITH CHECK (true)` for `anon,authenticated` roles:
1. **`link_clicks`** — "Anyone can insert clicks" allows inserting any data without validation
2. **`link_conversions`** — "Anyone can insert conversions" allows inserting any data without validation

Service-role policies on `integration_logs`, `admin_notifications`, and `bling_tokens` also use `true`, but these are safe because `service_role` bypasses RLS entirely.

### Plan

**Single migration** to drop and recreate the two policies with proper validation:

1. **`link_clicks`** — Require `short_link_id IS NOT NULL`
2. **`link_conversions`** — Require `short_link_id IS NOT NULL`

### Technical Details

```sql
-- link_clicks: tighten INSERT
DROP POLICY "Anyone can insert clicks" ON public.link_clicks;
CREATE POLICY "Anyone can insert clicks" ON public.link_clicks
  FOR INSERT TO anon, authenticated
  WITH CHECK (short_link_id IS NOT NULL);

-- link_conversions: tighten INSERT
DROP POLICY "Anyone can insert conversions" ON public.link_conversions;
CREATE POLICY "Anyone can insert conversions" ON public.link_conversions
  FOR INSERT TO anon, authenticated
  WITH CHECK (short_link_id IS NOT NULL);
```

No code changes needed — the existing frontend already provides `short_link_id` when inserting clicks/conversions.

### Leaked Password Finding
The other finding (Leaked Password Protection Disabled) is an auth configuration setting that will be enabled via the auth configuration tool.

