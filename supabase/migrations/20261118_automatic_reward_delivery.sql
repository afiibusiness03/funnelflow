-- Requires 20261109_security_and_analytics.sql to have been applied.
-- Auto-deliver is the seller's opt-in to immediate digital reward delivery.
-- Collecting an order number does not prove a purchase and does not require approval.
-- Preserve order_verified=false, fraud flags, tenant isolation, quotas and idempotency.
-- No historical claims are sent or marked delivered by this migration.
BEGIN;

CREATE OR REPLACE FUNCTION public.reserve_reward(p_submission uuid,p_tenant uuid,p_approve boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE s public.funnel_submissions; p public.promotions; c public.campaigns; d public.reward_deliveries; tenant_name text;
BEGIN
  SELECT * INTO s FROM public.funnel_submissions WHERE id=p_submission AND tenant_id=p_tenant FOR UPDATE;
  IF NOT FOUND OR s.claim_status='expired' OR (s.claim_status='rejected' AND NOT p_approve) THEN RAISE EXCEPTION 'Claim unavailable'; END IF;
  IF s.claim_status='delivered' THEN RETURN jsonb_build_object('reserved',true,'sent',true); END IF;
  SELECT * INTO d FROM public.reward_deliveries WHERE submission_id=s.id;
  IF FOUND THEN RETURN jsonb_build_object('reserved',true,'sent',d.sent_at IS NOT NULL,'reserved_at',d.reserved_at,'payload',d.payload); END IF;
  SELECT * INTO c FROM public.campaigns WHERE id=s.campaign_id AND tenant_id=s.tenant_id;
  SELECT name INTO tenant_name FROM public.tenants WHERE id=p_tenant AND (plan_status='active' OR (plan_status='trialing' AND trial_ends_at>now()));
  IF NOT FOUND OR c.id IS NULL OR c.status<>'active' THEN RAISE EXCEPTION 'Account or campaign inactive'; END IF;
  IF s.promotion_id IS NOT NULL THEN
    SELECT * INTO p FROM public.promotions WHERE id=s.promotion_id AND tenant_id=s.tenant_id FOR UPDATE;
    IF p.id IS NULL OR NOT p.is_active OR (p.max_redemptions IS NOT NULL AND p.redemptions_count>=p.max_redemptions) THEN RAISE EXCEPTION 'Reward unavailable'; END IF;
  END IF;
  IF NOT p_approve AND (p.id IS NULL OR NOT p.auto_deliver OR s.is_flagged OR p.type NOT IN ('coupon_code','digital_download')) THEN RAISE EXCEPTION 'Manual approval required'; END IF;
  IF (p.type='coupon_code' AND nullif(p.coupon_code,'') IS NULL) OR (p.type='digital_download' AND nullif(p.download_url,'') IS NULL) THEN RAISE EXCEPTION 'Reward content missing'; END IF;
  INSERT INTO public.reward_deliveries(submission_id,payload) VALUES(s.id,jsonb_build_object(
    'type',coalesce(p.type::text,'manual'),'customer_email',s.customer_email,'title',tenant_name,
    'coupon_code',p.coupon_code,'download_url',p.download_url,'delivery_message',p.delivery_message)) RETURNING * INTO d;
  IF p.id IS NOT NULL THEN UPDATE public.promotions SET redemptions_count=redemptions_count+1 WHERE id=p.id; END IF;
  UPDATE public.funnel_submissions SET claim_status='approved',claimed_at=now() WHERE id=s.id;
  RETURN jsonb_build_object('reserved',true,'sent',false,'reserved_at',d.reserved_at,'payload',d.payload);
END $$;
REVOKE ALL ON FUNCTION public.reserve_reward(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_reward(uuid,uuid,boolean) TO service_role;

COMMIT;
