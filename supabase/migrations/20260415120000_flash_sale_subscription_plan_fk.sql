-- Elite / flash checkout stores plan_id = 'flash_sale' on subscription_history.
-- plan_id REFERENCES subscription_plans(id); without this row inserts fail and verify-razorpay-payment cannot find the order.

INSERT INTO public.subscription_plans (
  id,
  name,
  display_name,
  description,
  price,
  yearly_price,
  duration_unit,
  duration_days,
  daily_limit,
  features,
  is_recommended,
  sort_order,
  is_active,
  button_text
)
VALUES (
  'flash_sale',
  'Elite Flash Sale',
  'Elite membership',
  'Limited-time Elite (5-year PRO MAX). Checkout amount comes from flash_sale_config.',
  1999,
  NULL,
  'days',
  1825,
  100,
  ARRAY['5 years of PRO MAX', 'Elite member benefits'],
  false,
  99,
  false,
  'Elite offer'
)
ON CONFLICT (id) DO NOTHING;
