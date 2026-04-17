-- Função genérica que preenche tenant_id automaticamente em INSERTs
CREATE OR REPLACE FUNCTION public.ensure_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.current_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Aplicar trigger em todas as tabelas tenant-scoped relevantes
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'whatsapp_templates',
    'whatsapp_template_folders',
    'whatsapp_funnels',
    'whatsapp_funnel_steps',
    'whatsapp_flows',
    'whatsapp_message_queue',
    'whatsapp_sending_config',
    'representatives',
    'doctors',
    'coupons',
    'short_links',
    'ai_agents',
    'ai_agent_knowledge_bases',
    'ai_kb_items',
    'ai_knowledge_bases',
    'ai_meetings',
    'ai_system_prompts',
    'ai_llm_config',
    'campaign_config',
    'popup_leads',
    'hero_banners',
    'promo_banners',
    'product_combos',
    'product_faqs',
    'product_groups',
    'product_testimonials',
    'manufacturers',
    'customer_tags',
    'admin_notifications',
    'integration_logs',
    'abandoned_carts',
    'orders',
    'commissions',
    'repurchase_funnel'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Só aplica se a tabela existe e tem coluna tenant_id
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenant_id'
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS ensure_tenant_id_trigger ON public.%I', t);
      EXECUTE format(
        'CREATE TRIGGER ensure_tenant_id_trigger BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.ensure_tenant_id()',
        t
      );
    END IF;
  END LOOP;
END $$;