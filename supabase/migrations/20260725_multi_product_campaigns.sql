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
