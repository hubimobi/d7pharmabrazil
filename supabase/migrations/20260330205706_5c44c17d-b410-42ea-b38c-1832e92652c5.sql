
-- WhatsApp Instances
CREATE TABLE public.whatsapp_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  instance_name text NOT NULL,
  api_url text NOT NULL DEFAULT '',
  api_key text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'disconnected',
  qr_code text,
  phone_number text,
  daily_limit integer NOT NULL DEFAULT 200,
  messages_sent_today integer NOT NULL DEFAULT 0,
  last_message_at timestamptz,
  last_reset_at timestamptz DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage whatsapp_instances" ON public.whatsapp_instances FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- WhatsApp Templates (spintax)
CREATE TABLE public.whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'geral',
  content text NOT NULL DEFAULT '',
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage whatsapp_templates" ON public.whatsapp_templates FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- WhatsApp Funnels
CREATE TABLE public.whatsapp_funnels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'recuperacao',
  trigger_event text NOT NULL DEFAULT 'carrinho_abandonado',
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_funnels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage whatsapp_funnels" ON public.whatsapp_funnels FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- WhatsApp Funnel Steps
CREATE TABLE public.whatsapp_funnel_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id uuid NOT NULL REFERENCES public.whatsapp_funnels(id) ON DELETE CASCADE,
  step_order integer NOT NULL DEFAULT 1,
  delay_minutes integer NOT NULL DEFAULT 15,
  template_id uuid REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
  instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_funnel_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage whatsapp_funnel_steps" ON public.whatsapp_funnel_steps FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- WhatsApp Message Queue
CREATE TABLE public.whatsapp_message_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_phone text NOT NULL,
  contact_name text NOT NULL DEFAULT '',
  template_id uuid REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
  funnel_id uuid REFERENCES public.whatsapp_funnels(id) ON DELETE SET NULL,
  step_id uuid REFERENCES public.whatsapp_funnel_steps(id) ON DELETE SET NULL,
  instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
  message_content text NOT NULL DEFAULT '',
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  priority integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_message_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage whatsapp_message_queue" ON public.whatsapp_message_queue FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- WhatsApp Message Log
CREATE TABLE public.whatsapp_message_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_phone text NOT NULL,
  contact_name text NOT NULL DEFAULT '',
  instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
  instance_name text,
  message_content text NOT NULL DEFAULT '',
  direction text NOT NULL DEFAULT 'outbound',
  status text NOT NULL DEFAULT 'sent',
  funnel_id uuid REFERENCES public.whatsapp_funnels(id) ON DELETE SET NULL,
  funnel_name text,
  step_id uuid REFERENCES public.whatsapp_funnel_steps(id) ON DELETE SET NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_message_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage whatsapp_message_log" ON public.whatsapp_message_log FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Indexes for performance
CREATE INDEX idx_whatsapp_queue_status ON public.whatsapp_message_queue(status, scheduled_at);
CREATE INDEX idx_whatsapp_queue_phone ON public.whatsapp_message_queue(contact_phone);
CREATE INDEX idx_whatsapp_log_phone ON public.whatsapp_message_log(contact_phone);
CREATE INDEX idx_whatsapp_log_created ON public.whatsapp_message_log(created_at DESC);
CREATE INDEX idx_whatsapp_funnel_steps_funnel ON public.whatsapp_funnel_steps(funnel_id, step_order);
