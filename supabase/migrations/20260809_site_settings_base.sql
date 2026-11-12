-- Makes fresh databases reproducible before the later landing-mode migration.
CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000000',
  hero_title text, hero_subtitle text,
  step1_title text, step1_desc text, step2_title text, step2_desc text,
  step3_title text, step3_desc text, step4_title text, step4_desc text,
  features_json jsonb, updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
