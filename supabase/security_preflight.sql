-- Read-only checks before deploying 20261109_security_and_analytics.sql.
-- Counts only: do not export customer details or secrets into diagnostic logs.
BEGIN TRANSACTION READ ONLY;
SELECT 'campaign_product_wrong_tenant' AS check_name,count(*) AS affected
FROM public.campaigns c JOIN public.products p ON p.id=c.product_id WHERE c.tenant_id<>p.tenant_id
UNION ALL
SELECT 'campaign_promotion_wrong_tenant',count(*)
FROM public.campaigns c JOIN public.promotions p ON p.id=c.promotion_id WHERE c.tenant_id<>p.tenant_id
UNION ALL
SELECT 'junction_wrong_tenant',count(*)
FROM public.campaign_products cp JOIN public.campaigns c ON c.id=cp.campaign_id
JOIN public.products p ON p.id=cp.product_id WHERE c.tenant_id<>p.tenant_id
UNION ALL
SELECT 'submission_wrong_tenant',count(*)
FROM public.funnel_submissions s JOIN public.campaigns c ON c.id=s.campaign_id WHERE s.tenant_id<>c.tenant_id
UNION ALL
SELECT 'legacy_qr_slashes',count(*) FROM public.campaigns WHERE qr_short_code LIKE '%/%';

SELECT 'duplicate_event_sessions' AS check_name,count(*) AS affected_groups FROM (
  SELECT campaign_id,event_type,metadata->>'session' FROM public.funnel_events
  WHERE metadata->>'session' IS NOT NULL GROUP BY 1,2,3 HAVING count(*)>1
) duplicates;
SELECT 'duplicate_claim_emails' AS check_name,count(*) AS affected_groups FROM (
  SELECT campaign_id,lower(trim(customer_email)) FROM public.funnel_submissions GROUP BY 1,2 HAVING count(*)>1
) duplicates;

SELECT table_name,column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='site_settings' ORDER BY ordinal_position;
SELECT schemaname,tablename,policyname,roles,cmd FROM pg_policies
WHERE schemaname='public' ORDER BY tablename,policyname;
ROLLBACK;
