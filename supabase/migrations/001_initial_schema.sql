-- ============================================================
-- FunnelFlow — Complete Database Schema
-- Multi-tenant SaaS: Post-Purchase Review & Engagement Platform
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TENANTS (Sellers / Organizations)
-- ============================================================
CREATE TABLE tenants (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  slug              TEXT UNIQUE NOT NULL,           -- used in URLs
  email             TEXT NOT NULL,
  logo_url          TEXT,
  brand_color       TEXT DEFAULT '#6366f1',
  custom_domain     TEXT UNIQUE,                    -- funnel.yourbrand.com
  plan              TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','growth','pro','agency')),
  plan_status       TEXT NOT NULL DEFAULT 'trialing' CHECK (plan_status IN ('trialing','active','past_due','canceled')),
  trial_ends_at     TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  stripe_customer_id     TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  max_products      INT NOT NULL DEFAULT 1,
  max_campaigns     INT NOT NULL DEFAULT 1,
  max_promotions    INT NOT NULL DEFAULT 1,
  whatsapp_enabled  BOOLEAN DEFAULT FALSE,          -- Phase 2
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS (Seller Accounts — linked to tenants)
-- ============================================================
CREATE TABLE users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','admin','member')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PLATFORM CONNECTIONS (Amazon, eBay, Shopify, etc.)
-- ============================================================
CREATE TABLE platform_connections (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL CHECK (platform IN ('amazon','ebay','walmart','etsy','shopify','woocommerce','bigcommerce','custom')),
  marketplace     TEXT,                             -- e.g. 'US', 'UK', 'DE'
  shop_name       TEXT,
  access_token    TEXT,                             -- encrypted
  refresh_token   TEXT,                             -- encrypted
  token_expires_at TIMESTAMPTZ,
  seller_id       TEXT,                             -- platform seller ID
  is_active       BOOLEAN DEFAULT TRUE,
  connected_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, platform, marketplace)
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connection_id   UUID REFERENCES platform_connections(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  asin            TEXT,                             -- Amazon ASIN
  sku             TEXT,
  platform        TEXT NOT NULL DEFAULT 'amazon',
  marketplace     TEXT DEFAULT 'US',
  product_url     TEXT,
  image_url       TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROMOTIONS (What sellers offer customers)
-- ============================================================
CREATE TABLE promotions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN (
                    'coupon_code',      -- static code
                    'digital_download', -- PDF, ebook, warranty
                    'gift_card',        -- Amazon, Visa gift card
                    'physical_gift',    -- requires shipping address
                    'email_only',       -- no promotion, collect email only
                    'loyalty_points'    -- Phase 2
                  )),
  -- Coupon code settings
  coupon_code     TEXT,
  coupon_pool     TEXT[],                           -- multiple codes (one per customer)
  -- Digital download settings
  download_url    TEXT,
  download_expires_hours INT DEFAULT 48,
  -- Gift card settings
  gift_card_value DECIMAL(10,2),
  gift_card_currency TEXT DEFAULT 'USD',
  -- Physical gift settings
  requires_address BOOLEAN DEFAULT FALSE,
  -- Delivery settings
  auto_deliver    BOOLEAN DEFAULT TRUE,             -- auto vs manual approval
  delivery_message TEXT,                            -- custom message to customer
  -- Limits
  max_redemptions INT,                              -- NULL = unlimited
  redemptions_count INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CAMPAIGNS (Links Product + Promotion + Funnel Settings)
-- ============================================================
CREATE TABLE campaigns (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id            UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  promotion_id          UUID REFERENCES promotions(id) ON DELETE SET NULL,
  name                  TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','archived')),
  -- Funnel settings
  require_order_verify  BOOLEAN DEFAULT TRUE,       -- verify order ID before proceeding
  require_review        BOOLEAN DEFAULT FALSE,      -- force review (optional)
  smart_routing         BOOLEAN DEFAULT TRUE,       -- only ask happy customers for review
  smart_routing_threshold INT DEFAULT 4,            -- min rating to ask for review (1-5)
  -- Branding overrides (inherits from tenant if null)
  custom_logo_url       TEXT,
  custom_color          TEXT,
  custom_thank_you_msg  TEXT,
  -- Language
  language              TEXT DEFAULT 'en' CHECK (language IN ('en','ar','fr','de','es','it','ja','zh')),
  -- Review platform link
  review_url            TEXT,                       -- direct link to product review page
  -- Tracking
  total_scans           INT DEFAULT 0,
  total_completions     INT DEFAULT 0,
  total_reviews_requested INT DEFAULT 0,
  -- QR Code
  qr_code_url           TEXT,                       -- stored SVG/PNG path
  qr_short_code         TEXT UNIQUE,                -- short code for URL e.g. /f/abc123
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FUNNEL SUBMISSIONS (Each customer interaction)
-- ============================================================
CREATE TABLE funnel_submissions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id       UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- Customer info
  customer_email    TEXT NOT NULL,
  customer_name     TEXT,
  customer_phone    TEXT,
  -- Shipping (for physical gifts)
  shipping_address  JSONB,                          -- {line1, line2, city, state, zip, country}
  -- Order verification
  order_id          TEXT,                           -- Amazon/eBay order ID
  order_verified    BOOLEAN DEFAULT FALSE,
  platform          TEXT,
  marketplace       TEXT DEFAULT 'US',
  -- Feedback
  rating            INT CHECK (rating BETWEEN 1 AND 5),
  feedback_text     TEXT,
  -- Smart routing result
  review_requested  BOOLEAN DEFAULT FALSE,          -- did we ask for a review?
  review_clicked    BOOLEAN DEFAULT FALSE,          -- did they click the review link?
  -- Promotion
  promotion_id      UUID REFERENCES promotions(id),
  claim_status      TEXT DEFAULT 'pending' CHECK (claim_status IN (
                      'pending',    -- waiting for approval
                      'approved',   -- approved, delivering
                      'delivered',  -- delivered to customer
                      'rejected',   -- rejected (fraud, invalid order)
                      'expired'     -- expired without action
                    )),
  claimed_at        TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  -- Delivery method used
  delivery_method   TEXT CHECK (delivery_method IN ('email','whatsapp','sms','manual')),
  -- Fraud detection
  ip_address        INET,
  user_agent        TEXT,
  is_flagged        BOOLEAN DEFAULT FALSE,
  flag_reason       TEXT,
  -- Metadata
  funnel_version    TEXT DEFAULT 'v1',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EMAIL DELIVERIES (Track all outgoing emails)
-- ============================================================
CREATE TABLE email_deliveries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  submission_id   UUID REFERENCES funnel_submissions(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  subject         TEXT NOT NULL,
  template        TEXT NOT NULL,                    -- 'promotion_delivery', 'follow_up', etc.
  resend_id       TEXT,                             -- Resend message ID
  status          TEXT DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','bounced','failed')),
  sent_at         TIMESTAMPTZ,
  opened_at       TIMESTAMPTZ,
  clicked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WHATSAPP DELIVERIES (Phase 2 — structure ready, disabled)
-- ============================================================
CREATE TABLE whatsapp_deliveries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  submission_id   UUID REFERENCES funnel_submissions(id) ON DELETE CASCADE,
  recipient_phone TEXT NOT NULL,
  message_type    TEXT,
  twilio_sid      TEXT,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','read','failed')),
  is_enabled      BOOLEAN DEFAULT FALSE,            -- disabled until Phase 2
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FUNNEL ANALYTICS EVENTS (Step-by-step tracking)
-- ============================================================
CREATE TABLE funnel_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id   UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES funnel_submissions(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL CHECK (event_type IN (
                  'qr_scan',          -- QR scanned
                  'step_1_complete',  -- order verified
                  'step_2_complete',  -- product selected
                  'step_3_complete',  -- feedback submitted
                  'review_shown',     -- review request shown
                  'review_clicked',   -- clicked review link
                  'review_skipped',   -- skipped review
                  'step_4_complete',  -- promotion claimed
                  'funnel_complete',  -- entire funnel done
                  'funnel_abandoned'  -- left without completing
                )),
  step_number   INT,
  metadata      JSONB,
  ip_address    INET,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STRIPE SUBSCRIPTIONS (Payment tracking)
-- ============================================================
CREATE TABLE subscriptions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_subscription_id  TEXT UNIQUE NOT NULL,
  stripe_customer_id      TEXT NOT NULL,
  plan                    TEXT NOT NULL,
  status                  TEXT NOT NULL,
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  cancel_at_period_end    BOOLEAN DEFAULT FALSE,
  canceled_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STRIPE INVOICES
-- ============================================================
CREATE TABLE invoices (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_invoice_id   TEXT UNIQUE NOT NULL,
  amount_paid         INT NOT NULL,                 -- in cents
  currency            TEXT DEFAULT 'usd',
  status              TEXT NOT NULL,
  invoice_pdf_url     TEXT,
  period_start        TIMESTAMPTZ,
  period_end          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES (Performance)
-- ============================================================

-- Tenants
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_stripe_customer ON tenants(stripe_customer_id);

-- Users
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);

-- Products
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_asin ON products(asin);

-- Campaigns
CREATE INDEX idx_campaigns_tenant ON campaigns(tenant_id);
CREATE INDEX idx_campaigns_qr_short_code ON campaigns(qr_short_code);
CREATE INDEX idx_campaigns_status ON campaigns(tenant_id, status);

-- Funnel Submissions
CREATE INDEX idx_submissions_campaign ON funnel_submissions(campaign_id);
CREATE INDEX idx_submissions_tenant ON funnel_submissions(tenant_id);
CREATE INDEX idx_submissions_email ON funnel_submissions(customer_email);
CREATE INDEX idx_submissions_order ON funnel_submissions(order_id);
CREATE INDEX idx_submissions_claim_status ON funnel_submissions(tenant_id, claim_status);
CREATE INDEX idx_submissions_created ON funnel_submissions(created_at DESC);

-- Funnel Events
CREATE INDEX idx_events_campaign ON funnel_events(campaign_id);
CREATE INDEX idx_events_tenant ON funnel_events(tenant_id);
CREATE INDEX idx_events_type ON funnel_events(event_type);
CREATE INDEX idx_events_created ON funnel_events(created_at DESC);

-- Email Deliveries
CREATE INDEX idx_emails_tenant ON email_deliveries(tenant_id);
CREATE INDEX idx_emails_submission ON email_deliveries(submission_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Multi-tenant isolation
-- ============================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's tenant_id
CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS Policies: Tenants can only see their own data
CREATE POLICY "tenant_isolation" ON tenants
  FOR ALL USING (id = get_tenant_id());

CREATE POLICY "tenant_isolation" ON users
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "tenant_isolation" ON platform_connections
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "tenant_isolation" ON products
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "tenant_isolation" ON promotions
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "tenant_isolation" ON campaigns
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "tenant_isolation" ON funnel_submissions
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "tenant_isolation" ON email_deliveries
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "tenant_isolation" ON whatsapp_deliveries
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "tenant_isolation" ON funnel_events
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "tenant_isolation" ON subscriptions
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "tenant_isolation" ON invoices
  FOR ALL USING (tenant_id = get_tenant_id());

-- Public funnel access (no auth needed — customers scanning QR codes)
CREATE POLICY "public_funnel_read" ON campaigns
  FOR SELECT USING (status = 'active');

CREATE POLICY "public_funnel_insert" ON funnel_submissions
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "public_event_insert" ON funnel_events
  FOR INSERT WITH CHECK (TRUE);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_promotions_updated_at BEFORE UPDATE ON promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_submissions_updated_at BEFORE UPDATE ON funnel_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate short code for QR URLs
CREATE OR REPLACE FUNCTION generate_short_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.qr_short_code IS NULL THEN
    NEW.qr_short_code = LOWER(SUBSTRING(encode(gen_random_bytes(6), 'base64') FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_campaign_short_code
  BEFORE INSERT ON campaigns
  FOR EACH ROW EXECUTE FUNCTION generate_short_code();

-- Auto-increment campaign scan/completion counters
CREATE OR REPLACE FUNCTION increment_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type = 'qr_scan' THEN
    UPDATE campaigns SET total_scans = total_scans + 1 WHERE id = NEW.campaign_id;
  ELSIF NEW.event_type = 'funnel_complete' THEN
    UPDATE campaigns SET total_completions = total_completions + 1 WHERE id = NEW.campaign_id;
  ELSIF NEW.event_type = 'review_shown' THEN
    UPDATE campaigns SET total_reviews_requested = total_reviews_requested + 1 WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_campaign_stats
  AFTER INSERT ON funnel_events
  FOR EACH ROW EXECUTE FUNCTION increment_campaign_stats();

-- Auto-set tenant limits based on plan
CREATE OR REPLACE FUNCTION set_tenant_limits()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.plan
    WHEN 'starter' THEN
      NEW.max_products := 1;
      NEW.max_campaigns := 1;
      NEW.max_promotions := 1;
    WHEN 'growth' THEN
      NEW.max_products := 10;
      NEW.max_campaigns := 999999;
      NEW.max_promotions := 5;
    WHEN 'pro' THEN
      NEW.max_products := 50;
      NEW.max_campaigns := 999999;
      NEW.max_promotions := 20;
    WHEN 'agency' THEN
      NEW.max_products := 999999;
      NEW.max_campaigns := 999999;
      NEW.max_promotions := 999999;
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenant_limits
  BEFORE INSERT OR UPDATE OF plan ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_tenant_limits();

-- ============================================================
-- SEED DATA (Plans reference)
-- ============================================================

-- Plan limits reference table
CREATE TABLE plans (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  price_monthly   INT NOT NULL,                     -- in cents
  price_annual    INT NOT NULL,                     -- in cents per month
  max_products    INT NOT NULL,
  max_campaigns   INT NOT NULL,
  max_promotions  INT NOT NULL,
  stripe_price_id_monthly TEXT,
  stripe_price_id_annual  TEXT,
  features        JSONB
);

INSERT INTO plans VALUES
  ('starter', 'Starter', 1900, 1400, 1, 1, 1, NULL, NULL,
   '{"all_platforms":true,"unlimited_reviews":true,"unlimited_leads":true,"custom_branding":true,"meta_pixel":true,"multi_language":true}'),
  ('growth', 'Growth', 4900, 3700, 10, -1, 5, NULL, NULL,
   '{"all_platforms":true,"unlimited_reviews":true,"unlimited_leads":true,"custom_branding":true,"meta_pixel":true,"multi_language":true,"ab_testing":true}'),
  ('pro', 'Pro', 9900, 7400, 50, -1, 20, NULL, NULL,
   '{"all_platforms":true,"unlimited_reviews":true,"unlimited_leads":true,"custom_branding":true,"meta_pixel":true,"multi_language":true,"ab_testing":true,"api_access":true,"priority_support":true}'),
  ('agency', 'Agency', 24900, 18700, -1, -1, -1, NULL, NULL,
   '{"all_platforms":true,"unlimited_reviews":true,"unlimited_leads":true,"custom_branding":true,"meta_pixel":true,"multi_language":true,"ab_testing":true,"api_access":true,"priority_support":true,"white_label":true}');
