

# Fix: Evolution API Status Loop + Unreachability

## Root Cause
Two combined issues:
1. The Evolution API webhook sends `connection.update` with state `"connecting"` every ~30s. The webhook code maps ANY state that isn't `"open"` or `"close"` to `"qr_ready"`, constantly overwriting the `"connected"` status.
2. The Evolution API at `evolution.d7pharmabrazil.com.br` is returning Cloudflare 530 (origin unreachable) when called FROM the edge function. The reverse direction works (Evolution → our webhook). This means the status check, QR code, and other actions that call Evolution will fail.

## Plan

### 1. Fix webhook status logic (prevents downgrade)
**File**: `supabase/functions/whatsapp-evolution-webhook/index.ts`
- When `connection.update` state is `"connecting"`, check the current DB status first
- If instance is already `"connected"`, do NOT downgrade to `"qr_ready"`
- Only update status when the new state is definitively `"open"` (connected) or `"close"` (disconnected)

### 2. Re-sync instances to connected
**Migration SQL**: Set the 3 instances back to `connected` (the webhook overwrote our previous fix).

### 3. Improve UI resilience for unreachable Evolution API
**File**: `src/pages/admin/WhatsAppPage.tsx`
- When status check returns 503/retryable, show the DB-stored status instead of failing
- Add a visual indicator that the Evolution API server is temporarily unreachable
- Don't block the entire UI when Evolution is down

## Technical details
- The Cloudflare 530 means the origin server (`evolution.d7pharmabrazil.com.br`) is not responding to requests from our edge function's IP range — this is an infrastructure issue on the Evolution server side, not something we can fix in code
- We CAN make the system resilient: trust the webhook-reported status and the DB state when direct API calls fail

