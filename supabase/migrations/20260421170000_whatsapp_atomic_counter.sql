-- Atomic increment for whatsapp_instances.messages_sent_today.
-- Replaces the stale read-increment-write pattern in process-queue
-- that causes race conditions when multiple messages process concurrently.
create or replace function increment_instance_sent_today(_instance_id uuid)
returns void
language sql
security definer
as $$
  update whatsapp_instances
  set
    messages_sent_today = messages_sent_today + 1,
    last_message_at     = now()
  where id = _instance_id;
$$;

-- Also add last_state_at column if it doesn't exist (used by evolution webhook)
alter table whatsapp_instances
  add column if not exists last_state_at timestamptz;
