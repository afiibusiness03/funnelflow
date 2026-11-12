-- Read-only preflight: one result table, so the SQL editor shows all counts together.
-- No inserts, updates, deletes, or permission changes. Run before the security migration.
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
SELECT 'legacy_qr_slashes',count(*) FROM public.campaigns WHERE qr_short_code LIKE '%/%'
UNION ALL
SELECT 'duplicate_event_sessions',count(*) FROM (
  SELECT campaign_id,event_type,metadata->>'session' FROM public.funnel_events
  WHERE metadata->>'session' IS NOT NULL GROUP BY 1,2,3 HAVING count(*)>1
) duplicate_sessions
UNION ALL
SELECT 'duplicate_claim_emails',count(*) FROM (
  SELECT campaign_id,lower(trim(customer_email)) FROM public.funnel_submissions
  GROUP BY 1,2 HAVING count(*)>1
) duplicate_emails;
