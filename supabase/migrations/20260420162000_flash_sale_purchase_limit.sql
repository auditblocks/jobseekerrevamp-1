ALTER TABLE public.flash_sale_config
ADD COLUMN IF NOT EXISTS max_purchases INTEGER NOT NULL DEFAULT 100;

ALTER TABLE public.flash_sale_config
DROP CONSTRAINT IF EXISTS flash_sale_config_max_purchases_check;

ALTER TABLE public.flash_sale_config
ADD CONSTRAINT flash_sale_config_max_purchases_check CHECK (max_purchases >= 1);

COMMENT ON COLUMN public.flash_sale_config.max_purchases
IS 'Maximum number of users allowed to buy the flash sale plan.';

CREATE OR REPLACE FUNCTION public.get_flash_sale_purchase_stats()
RETURNS TABLE(max_purchases INTEGER, purchased_count BIGINT, remaining_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_purchases INTEGER;
  v_purchased_count BIGINT;
BEGIN
  SELECT COALESCE(f.max_purchases, 100)
    INTO v_max_purchases
  FROM public.flash_sale_config f
  ORDER BY f.updated_at DESC NULLS LAST
  LIMIT 1;

  v_max_purchases := COALESCE(v_max_purchases, 100);

  SELECT COUNT(*)::BIGINT
    INTO v_purchased_count
  FROM public.subscription_history sh
  WHERE sh.plan_id = 'flash_sale'
    AND sh.status = 'completed';

  RETURN QUERY
  SELECT
    v_max_purchases,
    v_purchased_count,
    GREATEST(v_max_purchases - v_purchased_count, 0)::BIGINT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_flash_sale_purchase_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_flash_sale_purchase_stats() TO anon, authenticated, service_role;
