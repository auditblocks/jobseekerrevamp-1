-- Migration to add robust pricing cycle fields
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS yearly_price INTEGER,
ADD COLUMN IF NOT EXISTS five_year_price INTEGER;

-- Set default yearly prices backward-compatibly where price > 0
-- Price * 12 * 0.8 is exactly what the frontend used to do.
UPDATE public.subscription_plans 
SET yearly_price = ROUND(price * 12 * 0.8)
WHERE price > 0 AND yearly_price IS NULL;

-- Free plan handles implicitly
UPDATE public.subscription_plans 
SET yearly_price = 0
WHERE price = 0 AND yearly_price IS NULL;
