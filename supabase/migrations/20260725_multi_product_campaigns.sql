-- Migration for Multi-Product Campaigns & Customer Selection
CREATE TABLE IF NOT EXISTS campaign_products (
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (campaign_id, product_id)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_campaign_products_campaign_id ON campaign_products(campaign_id);

-- Add selected_product_ids array column to funnel_submissions
ALTER TABLE funnel_submissions ADD COLUMN IF NOT EXISTS selected_product_ids UUID[] DEFAULT '{}';

-- Enable RLS & Service Role Access Policies
ALTER TABLE campaign_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on campaign_products" ON campaign_products;
CREATE POLICY "Service role full access on campaign_products" ON campaign_products FOR ALL USING (true) WITH CHECK (true);

-- Performance Indexes (Dashboard & Funnel Query Optimization)
CREATE INDEX IF NOT EXISTS idx_funnel_events_campaign_type ON funnel_events(campaign_id, event_type);
CREATE INDEX IF NOT EXISTS idx_funnel_submissions_campaign_created ON funnel_submissions(campaign_id, created_at DESC);
