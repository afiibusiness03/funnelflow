-- Requires the existing 20261109_security_and_analytics.sql migration.
-- Repeat customers may submit multiple claims using the same email address.
-- Only reuse of a non-empty order number within the same campaign is blocked.
-- Existing claims, reward reservations and email-delivery settings are untouched.
BEGIN;

CREATE INDEX IF NOT EXISTS idx_submission_campaign_order_normalized
  ON public.funnel_submissions(campaign_id, btrim(order_id))
  WHERE order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.prevent_duplicate_claim() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  NEW.customer_email := lower(trim(NEW.customer_email));
  NEW.order_id := nullif(trim(NEW.order_id), '');

  IF NEW.order_id IS NOT NULL THEN
    -- Keep concurrent requests for the same campaign serialized.
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.campaign_id::text, 0));
    IF EXISTS (
      SELECT 1 FROM public.funnel_submissions
      WHERE campaign_id = NEW.campaign_id
        AND order_id IS NOT NULL
        AND btrim(order_id) = NEW.order_id
    ) THEN
      RAISE EXCEPTION 'A claim for this order already exists in this campaign'
        USING ERRCODE = '23505';
    END IF;
  END IF;

  RETURN NEW;
END $$;

COMMIT;
