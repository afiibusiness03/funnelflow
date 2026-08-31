-- Performance Optimization Indexes
-- Adds indexes on high-frequency lookup fields to prevent slow database queries and Cloudflare 524 timeouts

CREATE INDEX IF NOT EXISTS idx_campaigns_qr_short_code ON campaigns(qr_short_code);
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_status ON campaigns(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_products_campaign_id ON campaign_products(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_products_product_id ON campaign_products(product_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_promotions_tenant_id ON promotions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_funnel_submissions_campaign_id ON funnel_submissions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_funnel_submissions_tenant_id ON funnel_submissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_campaign_id ON funnel_events(campaign_id);
