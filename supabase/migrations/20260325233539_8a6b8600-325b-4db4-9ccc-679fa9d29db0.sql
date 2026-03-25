ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS hero_title text DEFAULT 'Suplementos de Alta Performance com Qualidade Farmacêutica',
  ADD COLUMN IF NOT EXISTS hero_subtitle text DEFAULT 'Resultados reais com segurança e controle rigoroso',
  ADD COLUMN IF NOT EXISTS hero_button_text text DEFAULT 'Comprar Agora',
  ADD COLUMN IF NOT EXISTS hero_button_link text DEFAULT '/produtos',
  ADD COLUMN IF NOT EXISTS hero_button2_text text DEFAULT 'Saiba Mais',
  ADD COLUMN IF NOT EXISTS hero_button2_link text DEFAULT '/#beneficios',
  ADD COLUMN IF NOT EXISTS hero_image_url text DEFAULT '';