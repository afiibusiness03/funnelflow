-- Apply before deploying the matching application. Transactional; no customer rows are deleted.
BEGIN;

CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000000',
  public_landing_enabled boolean NOT NULL DEFAULT true,
  hero_title text, hero_subtitle text,
  step1_title text, step1_desc text, step2_title text, step2_desc text,
  step3_title text, step3_desc text, step4_title text, step4_desc text,
  features_json jsonb, updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.get_tenant_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid()
$$;
CREATE OR REPLACE FUNCTION public.is_platform_admin() RETURNS boolean
LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT coalesce(auth.jwt()->'app_metadata'->>'platform_admin', 'false') = 'true'
$$;
CREATE OR REPLACE FUNCTION public.can_manage_tenant(p_tenant uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u JOIN public.tenants t ON t.id = u.tenant_id
    WHERE u.id = auth.uid() AND u.tenant_id = p_tenant AND u.role IN ('owner','admin')
      AND (t.plan_status = 'active' OR (t.plan_status = 'trialing' AND t.trial_ends_at > now()))
  )
$$;
REVOKE ALL ON FUNCTION public.get_tenant_id(), public.can_manage_tenant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_id(), public.can_manage_tenant(uuid) TO authenticated, service_role;

-- Replace policies, including accidentally permissive policies added outside migrations.
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = ANY(ARRAY[
      'tenants','users','platform_connections','products','promotions','campaigns','campaign_products',
      'funnel_submissions','funnel_events','email_deliveries','whatsapp_deliveries','subscriptions','invoices',
      'waitlist_requests','site_settings','plans'])
  LOOP EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname,r.schemaname,r.tablename); END LOOP;
END $$;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['tenants','users','platform_connections','products','promotions','campaigns',
    'campaign_products','funnel_submissions','funnel_events','email_deliveries','whatsapp_deliveries',
    'subscriptions','invoices','waitlist_requests','site_settings','plans'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
  END LOOP;
END $$;

GRANT SELECT ON public.tenants, public.users, public.products, public.promotions, public.campaigns,
  public.campaign_products, public.funnel_submissions, public.funnel_events, public.email_deliveries,
  public.whatsapp_deliveries, public.subscriptions, public.invoices TO authenticated;
GRANT UPDATE (name,logo_url,brand_color,custom_domain) ON public.tenants TO authenticated;
GRANT UPDATE (full_name,avatar_url) ON public.users TO authenticated;
GRANT DELETE ON public.products,public.promotions,public.campaigns TO authenticated;
GRANT INSERT(tenant_id,name,platform,marketplace,asin,sku,product_url,review_url,image_url,is_active),
  UPDATE(name,platform,marketplace,asin,sku,product_url,review_url,image_url,is_active,updated_at) ON public.products TO authenticated;
GRANT INSERT(tenant_id,name,type,coupon_code,discount_type,discount_value,discount_currency,download_url,download_expires_hours,gift_card_value,gift_card_currency,requires_address,auto_deliver,delivery_message,max_redemptions,is_active),
  UPDATE(name,coupon_code,discount_type,discount_value,discount_currency,download_url,download_expires_hours,gift_card_value,gift_card_currency,requires_address,auto_deliver,delivery_message,max_redemptions,is_active,updated_at) ON public.promotions TO authenticated;
GRANT INSERT(tenant_id,name,product_id,promotion_id,status,require_order_verify,smart_routing,smart_routing_threshold,language,review_url,custom_thank_you_msg,custom_color,custom_logo_url),
  UPDATE(name,product_id,promotion_id,status,require_order_verify,smart_routing,smart_routing_threshold,language,review_url,custom_thank_you_msg,custom_color,custom_logo_url,updated_at) ON public.campaigns TO authenticated;
GRANT SELECT (id,tenant_id,platform,marketplace,shop_name,is_active,connected_at,seller_id,updated_at)
  ON public.platform_connections TO authenticated;
GRANT INSERT (tenant_id,platform,marketplace,shop_name,is_active),
  UPDATE (marketplace,shop_name,is_active) ON public.platform_connections TO authenticated;

CREATE POLICY tenant_read ON public.tenants FOR SELECT TO authenticated USING (id = public.get_tenant_id());
CREATE POLICY tenant_update ON public.tenants FOR UPDATE TO authenticated USING (public.can_manage_tenant(id)) WITH CHECK (id = public.get_tenant_id());
CREATE POLICY users_read ON public.users FOR SELECT TO authenticated USING (tenant_id = public.get_tenant_id());
CREATE POLICY users_update ON public.users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND tenant_id = public.get_tenant_id());

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['products','promotions','campaigns','platform_connections'] LOOP
    EXECUTE format('CREATE POLICY tenant_read ON public.%I FOR SELECT TO authenticated USING (tenant_id = public.get_tenant_id())',t);
    EXECUTE format('CREATE POLICY tenant_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_manage_tenant(tenant_id))',t);
    EXECUTE format('CREATE POLICY tenant_update ON public.%I FOR UPDATE TO authenticated USING (public.can_manage_tenant(tenant_id)) WITH CHECK (public.can_manage_tenant(tenant_id))',t);
    EXECUTE format('CREATE POLICY tenant_delete ON public.%I FOR DELETE TO authenticated USING (public.can_manage_tenant(tenant_id))',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['funnel_submissions','funnel_events','email_deliveries','whatsapp_deliveries','subscriptions','invoices'] LOOP
    EXECUTE format('CREATE POLICY tenant_read ON public.%I FOR SELECT TO authenticated USING (tenant_id = public.get_tenant_id())',t);
  END LOOP;
END $$;
CREATE POLICY tenant_read ON public.campaign_products FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.tenant_id = public.get_tenant_id())
);
GRANT SELECT ON public.waitlist_requests TO authenticated;
CREATE POLICY admin_read ON public.waitlist_requests FOR SELECT TO authenticated USING (public.is_platform_admin());
GRANT SELECT ON public.site_settings,public.plans TO anon,authenticated;
GRANT INSERT,UPDATE ON public.site_settings TO authenticated;
CREATE POLICY public_read ON public.site_settings FOR SELECT USING (true);
CREATE POLICY admin_insert ON public.site_settings FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());
CREATE POLICY admin_update ON public.site_settings FOR UPDATE TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY public_read ON public.plans FOR SELECT USING (true);

-- Database enforcement covers service-role callers as well as browser writes.
CREATE OR REPLACE FUNCTION public.enforce_tenant_relations() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE campaign_tenant uuid; product_tenant uuid; expected_promotion uuid;
BEGIN
  -- Preserve historical selections when a seller edits a campaign after a claim.
  IF TG_TABLE_NAME='funnel_submissions' THEN
    IF TG_OP='UPDATE' THEN
      IF NEW.tenant_id IS NOT DISTINCT FROM OLD.tenant_id AND NEW.campaign_id IS NOT DISTINCT FROM OLD.campaign_id
        AND NEW.promotion_id IS NOT DISTINCT FROM OLD.promotion_id AND NEW.selected_product_ids IS NOT DISTINCT FROM OLD.selected_product_ids THEN RETURN NEW; END IF;
    END IF;
  END IF;
  IF TG_TABLE_NAME = 'campaigns' THEN
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE id=NEW.product_id AND tenant_id=NEW.tenant_id) THEN RAISE EXCEPTION 'Invalid product relationship' USING ERRCODE='23514'; END IF;
    IF NEW.promotion_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.promotions WHERE id=NEW.promotion_id AND tenant_id=NEW.tenant_id) THEN RAISE EXCEPTION 'Invalid promotion relationship' USING ERRCODE='23514'; END IF;
  ELSIF TG_TABLE_NAME = 'products' THEN
    IF NEW.connection_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.platform_connections WHERE id=NEW.connection_id AND tenant_id=NEW.tenant_id) THEN RAISE EXCEPTION 'Invalid connection relationship' USING ERRCODE='23514'; END IF;
  ELSIF TG_TABLE_NAME = 'campaign_products' THEN
    SELECT tenant_id INTO campaign_tenant FROM public.campaigns WHERE id=NEW.campaign_id;
    SELECT tenant_id INTO product_tenant FROM public.products WHERE id=NEW.product_id;
    IF campaign_tenant IS NULL OR product_tenant IS DISTINCT FROM campaign_tenant THEN RAISE EXCEPTION 'Invalid campaign product relationship' USING ERRCODE='23514'; END IF;
  ELSIF TG_TABLE_NAME IN ('funnel_submissions','funnel_events') THEN
    SELECT tenant_id,promotion_id INTO campaign_tenant,expected_promotion FROM public.campaigns WHERE id=NEW.campaign_id;
    IF campaign_tenant IS DISTINCT FROM NEW.tenant_id THEN RAISE EXCEPTION 'Invalid campaign tenant' USING ERRCODE='23514'; END IF;
    IF TG_TABLE_NAME = 'funnel_submissions' THEN
      IF NEW.promotion_id IS NOT NULL AND NEW.promotion_id IS DISTINCT FROM expected_promotion THEN RAISE EXCEPTION 'Invalid submission promotion' USING ERRCODE='23514'; END IF;
      IF EXISTS (SELECT 1 FROM unnest(NEW.selected_product_ids) p(id) WHERE NOT EXISTS (
        SELECT 1 FROM public.products pr WHERE pr.id=p.id AND pr.tenant_id=NEW.tenant_id AND (
          EXISTS (SELECT 1 FROM public.campaign_products cp WHERE cp.campaign_id=NEW.campaign_id AND cp.product_id=p.id)
          OR EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id=NEW.campaign_id AND c.product_id=p.id))))
      THEN RAISE EXCEPTION 'Invalid selected products' USING ERRCODE='23514'; END IF;
    ELSE
      IF NEW.submission_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.funnel_submissions WHERE id=NEW.submission_id AND campaign_id=NEW.campaign_id AND tenant_id=NEW.tenant_id) THEN RAISE EXCEPTION 'Invalid event submission' USING ERRCODE='23514'; END IF;
    END IF;
  END IF;
  IF TG_OP='UPDATE' AND TG_TABLE_NAME <> 'campaign_products' THEN
    IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN RAISE EXCEPTION 'Cannot move data between tenants' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['products','campaigns','campaign_products','funnel_submissions','funnel_events'] LOOP
    EXECUTE format('CREATE TRIGGER enforce_tenant_relations BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_relations()',t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_plan_quota() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE account public.tenants; cap integer; used bigint;
BEGIN
  SELECT * INTO account FROM public.tenants WHERE id=NEW.tenant_id FOR UPDATE;
  IF NOT (account.plan_status='active' OR (account.plan_status='trialing' AND account.trial_ends_at>now())) THEN RAISE EXCEPTION 'Active subscription required' USING ERRCODE='23514'; END IF;
  cap := CASE TG_TABLE_NAME WHEN 'products' THEN account.max_products WHEN 'campaigns' THEN account.max_campaigns ELSE account.max_promotions END;
  EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id=$1',TG_TABLE_NAME) INTO used USING NEW.tenant_id;
  IF cap >= 0 AND used >= cap THEN RAISE EXCEPTION 'Plan limit reached' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER enforce_quota BEFORE INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_quota();
CREATE TRIGGER enforce_quota BEFORE INSERT ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_quota();
CREATE TRIGGER enforce_quota BEFORE INSERT ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_quota();

-- Serializes duplicate checks without deleting legacy duplicates or changing existing customer data.
CREATE INDEX IF NOT EXISTS idx_submission_email_normalized ON public.funnel_submissions(campaign_id,lower(customer_email));
CREATE INDEX IF NOT EXISTS idx_submission_ip_created ON public.funnel_submissions(ip_address,created_at);
CREATE OR REPLACE FUNCTION public.prevent_duplicate_claim() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  NEW.customer_email := lower(trim(NEW.customer_email));
  NEW.order_id := nullif(trim(NEW.order_id),'');
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.campaign_id::text,0));
  IF EXISTS (SELECT 1 FROM public.funnel_submissions WHERE campaign_id=NEW.campaign_id AND (lower(customer_email)=NEW.customer_email OR (NEW.order_id IS NOT NULL AND order_id=NEW.order_id))) THEN RAISE EXCEPTION 'Duplicate claim' USING ERRCODE='23505'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER prevent_duplicate_claim BEFORE INSERT ON public.funnel_submissions FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_claim();

CREATE TABLE public.request_rate_limits (key text PRIMARY KEY, hits integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE INDEX request_rate_expiry ON public.request_rate_limits(expires_at);
ALTER TABLE public.request_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.request_rate_limits FROM anon,authenticated;
CREATE OR REPLACE FUNCTION public.consume_rate_limit(p_key text,p_limit integer,p_window_seconds integer) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE n integer;
BEGIN
  IF p_limit NOT BETWEEN 1 AND 1000 OR p_window_seconds NOT BETWEEN 1 AND 86400 OR length(p_key)>128 THEN RAISE EXCEPTION 'Invalid rate limit'; END IF;
  INSERT INTO public.request_rate_limits AS r VALUES(p_key,1,now()+make_interval(secs=>p_window_seconds))
  ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN r.expires_at<=now() THEN 1 ELSE least(r.hits+1,p_limit+1) END,
    expires_at=CASE WHEN r.expires_at<=now() THEN now()+make_interval(secs=>p_window_seconds) ELSE r.expires_at END RETURNING hits INTO n;
  DELETE FROM public.request_rate_limits WHERE key IN (SELECT key FROM public.request_rate_limits WHERE expires_at<now()-interval '1 day' LIMIT 100);
  RETURN n<=p_limit;
END $$;
REVOKE ALL ON FUNCTION public.consume_rate_limit(text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text,integer,integer) TO service_role;

-- Reserve once per claim, atomically enforce redemption caps and persist retry identity.
CREATE TABLE public.reward_deliveries (
  submission_id uuid PRIMARY KEY REFERENCES public.funnel_submissions(id) ON DELETE CASCADE,
  reserved_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz, resend_id text, payload jsonb NOT NULL
);
ALTER TABLE public.reward_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reward_deliveries FROM anon,authenticated;
GRANT ALL ON public.reward_deliveries TO service_role;
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
  IF NOT p_approve AND (p.id IS NULL OR NOT p.auto_deliver OR s.is_flagged OR (c.require_order_verify AND NOT s.order_verified) OR p.type NOT IN ('coupon_code','digital_download')) THEN RAISE EXCEPTION 'Manual approval required'; END IF;
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

-- A compact aggregate replaces full event/rating downloads; only the current tenant is accepted.
CREATE OR REPLACE FUNCTION public.dashboard_metrics(p_campaign uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
WITH events AS (
  SELECT event_type,created_at FROM public.funnel_events WHERE tenant_id=public.get_tenant_id()
    AND (p_campaign IS NULL OR campaign_id=p_campaign) AND created_at>=now()-interval '60 days'
), claims AS (
  SELECT claim_status,rating FROM public.funnel_submissions WHERE tenant_id=public.get_tenant_id()
    AND (p_campaign IS NULL OR campaign_id=p_campaign)
), daily AS (
  SELECT (created_at AT TIME ZONE 'UTC')::date AS day,
    count(*) FILTER(WHERE event_type='qr_scan') AS scans,
    count(*) FILTER(WHERE event_type='funnel_complete') AS completions
  FROM events WHERE created_at>=now()-interval '14 days' GROUP BY 1
), ratings AS (SELECT rating,count(*) AS n FROM claims WHERE rating IS NOT NULL GROUP BY rating),
statuses AS (SELECT claim_status,count(*) AS n FROM claims GROUP BY claim_status),
steps AS (SELECT event_type,count(*) AS n FROM events WHERE created_at>=now()-interval '30 days' GROUP BY event_type)
SELECT jsonb_build_object(
 'totalEmails',(SELECT count(*) FROM claims),
 'scans30',(SELECT count(*) FROM events WHERE event_type='qr_scan' AND created_at>=now()-interval '30 days'),
 'scansPrev',(SELECT count(*) FROM events WHERE event_type='qr_scan' AND created_at<now()-interval '30 days'),
 'completions30',(SELECT count(*) FROM events WHERE event_type='funnel_complete' AND created_at>=now()-interval '30 days'),
 'completionsPrev',(SELECT count(*) FROM events WHERE event_type='funnel_complete' AND created_at<now()-interval '30 days'),
 'ratings',coalesce((SELECT jsonb_object_agg(rating,n) FROM ratings),'{}'::jsonb),
 'statuses',coalesce((SELECT jsonb_object_agg(claim_status,n) FROM statuses),'{}'::jsonb),
 'steps',coalesce((SELECT jsonb_object_agg(event_type,n) FROM steps),'{}'::jsonb),
 'daily',coalesce((SELECT jsonb_agg(jsonb_build_object('day',day,'scans',scans,'completions',completions) ORDER BY day) FROM daily),'[]'::jsonb)
)
$$;
REVOKE ALL ON FUNCTION public.dashboard_metrics(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dashboard_metrics(uuid) TO authenticated;

CREATE UNIQUE INDEX funnel_event_session_unique ON public.funnel_events(campaign_id,event_type,(metadata->>'session')) WHERE metadata->>'session' IS NOT NULL;
CREATE OR REPLACE FUNCTION public.record_claim_completion() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  INSERT INTO public.funnel_events(campaign_id,tenant_id,submission_id,event_type,step_number)
    VALUES(NEW.campaign_id,NEW.tenant_id,NEW.id,'funnel_complete',5);
  RETURN NEW;
END $$;
CREATE TRIGGER record_claim_completion AFTER INSERT ON public.funnel_submissions FOR EACH ROW EXECUTE FUNCTION public.record_claim_completion();

CREATE OR REPLACE FUNCTION public.finish_reward(p_submission uuid,p_tenant uuid,p_resend_id text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE s public.funnel_submissions; already_sent timestamptz;
BEGIN
  SELECT * INTO s FROM public.funnel_submissions WHERE id=p_submission AND tenant_id=p_tenant FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Claim unavailable'; END IF;
  SELECT sent_at INTO already_sent FROM public.reward_deliveries WHERE submission_id=s.id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reward not reserved'; END IF;
  IF already_sent IS NOT NULL THEN RETURN; END IF;
  UPDATE public.reward_deliveries SET sent_at=now(),resend_id=p_resend_id WHERE submission_id=s.id;
  INSERT INTO public.email_deliveries(tenant_id,submission_id,recipient_email,subject,template,resend_id,status,sent_at)
    VALUES(s.tenant_id,s.id,s.customer_email,'Your reward','promotion_delivery',p_resend_id,'sent',now());
  UPDATE public.funnel_submissions SET claim_status='delivered',delivered_at=now(),delivery_method='email' WHERE id=s.id;
END $$;
REVOKE ALL ON FUNCTION public.finish_reward(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_reward(uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.replace_campaign_products(p_campaign uuid,p_tenant uuid,p_products uuid[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  PERFORM 1 FROM public.campaigns WHERE id=p_campaign AND tenant_id=p_tenant FOR UPDATE;
  IF NOT FOUND OR cardinality(p_products) NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Invalid campaign'; END IF;
  IF EXISTS(SELECT 1 FROM unnest(p_products) p(id) WHERE NOT EXISTS(SELECT 1 FROM public.products WHERE id=p.id AND tenant_id=p_tenant)) THEN RAISE EXCEPTION 'Invalid product relationship'; END IF;
  DELETE FROM public.campaign_products WHERE campaign_id=p_campaign;
  INSERT INTO public.campaign_products(campaign_id,product_id) SELECT p_campaign,id FROM (SELECT DISTINCT unnest(p_products) AS id) p;
END $$;
REVOKE ALL ON FUNCTION public.replace_campaign_products(uuid,uuid,uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.replace_campaign_products(uuid,uuid,uuid[]) TO service_role;

-- No need to fetch customer rows just to display four tab counts.
CREATE OR REPLACE FUNCTION public.claim_counts() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
  SELECT coalesce(jsonb_object_agg(claim_status,n),'{}'::jsonb) FROM (
    SELECT claim_status,count(*) n FROM public.funnel_submissions WHERE tenant_id=public.get_tenant_id() GROUP BY claim_status
  ) counts
$$;
REVOKE ALL ON FUNCTION public.claim_counts() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.claim_counts() TO authenticated;

CREATE OR REPLACE FUNCTION public.create_tenant_account(p_name text,p_full_name text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE tenant uuid; uid uuid:=auth.uid(); account_email text:=auth.jwt()->>'email';
BEGIN
  IF uid IS NULL OR account_email IS NULL OR length(trim(p_name)) NOT BETWEEN 2 AND 200 OR length(p_full_name)>200 THEN RAISE EXCEPTION 'Invalid account'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,1));
  SELECT tenant_id INTO tenant FROM public.users WHERE id=uid;
  IF FOUND THEN RETURN tenant; END IF;
  IF EXISTS(SELECT 1 FROM public.site_settings WHERE public_landing_enabled=false) AND NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Registration is by invitation only'; END IF;
  INSERT INTO public.tenants(name,slug,email,plan,plan_status,trial_ends_at)
    VALUES(trim(p_name),'account-'||replace(gen_random_uuid()::text,'-',''),account_email,'starter','trialing',now()+interval '14 days') RETURNING id INTO tenant;
  INSERT INTO public.users(id,tenant_id,email,full_name,role) VALUES(uid,tenant,account_email,p_full_name,'owner');
  RETURN tenant;
END $$;
REVOKE ALL ON FUNCTION public.create_tenant_account(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_tenant_account(text,text) TO authenticated;

-- Protect direct browser writes, not just the API validators.
CREATE OR REPLACE FUNCTION public.validate_content_fields() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE row_data jsonb:=to_jsonb(NEW); key text; value text;
BEGIN
  FOREACH key IN ARRAY ARRAY['product_url','review_url','image_url','download_url','custom_logo_url','logo_url'] LOOP
    value:=row_data->>key;
    IF value IS NOT NULL AND value<>'' AND (length(value)>2048 OR value !~ '^https://[^/@[:space:]]+([/?#]|$)') THEN RAISE EXCEPTION 'Use an HTTPS URL without credentials' USING ERRCODE='23514'; END IF;
  END LOOP;
  IF length(row_data->>'name')>200 OR length(row_data->>'delivery_message')>4000 OR length(row_data->>'custom_thank_you_msg')>2000 THEN RAISE EXCEPTION 'Text too long' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['tenants','products','campaigns','promotions'] LOOP
    EXECUTE format('CREATE TRIGGER validate_content_fields BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.validate_content_fields()',t);
  END LOOP;
END $$;

-- Explicit seller confirmation for gifts/points/collection-only claims; never log an email that was not sent.
CREATE OR REPLACE FUNCTION public.finish_manual_reward(p_submission uuid,p_tenant uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE s public.funnel_submissions; d public.reward_deliveries;
BEGIN
  SELECT * INTO s FROM public.funnel_submissions WHERE id=p_submission AND tenant_id=p_tenant FOR UPDATE;
  IF NOT FOUND OR s.claim_status NOT IN ('approved','delivered') THEN RAISE EXCEPTION 'Approve claim first'; END IF;
  SELECT * INTO d FROM public.reward_deliveries WHERE submission_id=s.id FOR UPDATE;
  IF NOT FOUND OR d.payload->>'type' IN ('coupon_code','digital_download') THEN RAISE EXCEPTION 'Manual fulfillment unavailable'; END IF;
  IF d.sent_at IS NOT NULL THEN RETURN; END IF;
  UPDATE public.reward_deliveries SET sent_at=now() WHERE submission_id=s.id;
  UPDATE public.funnel_submissions SET claim_status='delivered',delivered_at=now(),delivery_method='manual' WHERE id=s.id;
END $$;
REVOKE ALL ON FUNCTION public.finish_manual_reward(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_manual_reward(uuid,uuid) TO service_role;

CREATE INDEX IF NOT EXISTS idx_events_tenant_created ON public.funnel_events(tenant_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_campaign_created ON public.funnel_events(campaign_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_claims_tenant_status_created ON public.funnel_submissions(tenant_id,claim_status,created_at DESC);
-- New QR codes are URL-safe; existing printed codes remain unchanged.
CREATE OR REPLACE FUNCTION public.generate_short_code() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,extensions,pg_temp AS $$
BEGIN
  IF NEW.qr_short_code IS NULL THEN NEW.qr_short_code=encode(gen_random_bytes(10),'hex'); END IF;
  RETURN NEW;
END $$;
COMMIT;
