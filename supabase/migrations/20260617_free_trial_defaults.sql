-- Free Trial: set default limits for new tenants
-- Run this in Supabase Dashboard → SQL Editor

ALTER TABLE tenants
  ALTER COLUMN max_campaigns  SET DEFAULT 2,
  ALTER COLUMN max_promotions SET DEFAULT 2;

-- Backfill: any existing trialing tenants that have no trial_ends_at get 14 days from now
UPDATE tenants
SET trial_ends_at = now() + interval '14 days'
WHERE plan_status = 'trialing'
  AND trial_ends_at IS NULL;

-- Backfill: any existing trialing tenants with no limits get the free trial limits  
UPDATE tenants
SET
  max_campaigns  = 2,
  max_promotions = 2
WHERE plan_status = 'trialing'
  AND max_campaigns > 2;
