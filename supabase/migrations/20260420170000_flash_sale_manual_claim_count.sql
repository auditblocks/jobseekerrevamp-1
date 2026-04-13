ALTER TABLE public.flash_sale_config
ADD COLUMN IF NOT EXISTS manual_claimed_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.flash_sale_config
DROP CONSTRAINT IF EXISTS flash_sale_config_manual_claimed_count_check;

ALTER TABLE public.flash_sale_config
ADD CONSTRAINT flash_sale_config_manual_claimed_count_check CHECK (manual_claimed_count >= 0);

COMMENT ON COLUMN public.flash_sale_config.manual_claimed_count
IS 'Admin-configured claimed count for flash sale. Effective claimed count is max(actual purchases, manual count).';

DROP FUNCTION IF EXISTS public.get_flash_sale_purchase_stats();

CREATE OR REPLACE FUNCTION public.get_flash_sale_purchase_stats()
RETURNS TABLE(
  max_purchases INTEGER,
  purchased_count BIGINT,
  remaining_count BIGINT,
  actual_purchased_count BIGINT,
  manual_claimed_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_purchases INTEGER;
  v_manual_claimed_count INTEGER;
  v_actual_purchased_count BIGINT;
  v_effective_claimed_count BIGINT;
BEGIN
  SELECT
    COALESCE(f.max_purchases, 100),
    COALESCE(f.manual_claimed_count, 0)
  INTO
    v_max_purchases,
    v_manual_claimed_count
  FROM public.flash_sale_config f
  ORDER BY f.updated_at DESC NULLS LAST
  LIMIT 1;

  v_max_purchases := COALESCE(v_max_purchases, 100);
  v_manual_claimed_count := COALESCE(v_manual_claimed_count, 0);

  SELECT COUNT(*)::BIGINT
    INTO v_actual_purchased_count
  FROM public.subscription_history sh
  WHERE sh.plan_id = 'flash_sale'
    AND sh.status = 'completed';

  v_effective_claimed_count := GREATEST(v_actual_purchased_count, v_manual_claimed_count::BIGINT);

  RETURN QUERY
  SELECT
    v_max_purchases,
    v_effective_claimed_count,
    GREATEST(v_max_purchases - v_effective_claimed_count, 0)::BIGINT,
    v_actual_purchased_count,
    v_manual_claimed_count::BIGINT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_flash_sale_purchase_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_flash_sale_purchase_stats() TO anon, authenticated, service_role;
