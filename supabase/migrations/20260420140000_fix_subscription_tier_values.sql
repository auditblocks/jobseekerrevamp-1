-- Fix bad subscription_tier values caused by using plan.name instead of plan.id
UPDATE public.profiles
SET subscription_tier = 'PRO_MAX', updated_at = now()
WHERE UPPER(REPLACE(subscription_tier, ' ', '_')) = 'PRO_MAX'
  AND subscription_tier != 'PRO_MAX';

UPDATE public.profiles
SET subscription_tier = 'PRO', updated_at = now()
WHERE UPPER(subscription_tier) IN ('PRO PLAN', 'PRO_PLAN')
  AND subscription_tier != 'PRO';

-- Also normalize any "Pro Max Plan" or similar variations
UPDATE public.profiles
SET subscription_tier = 'PRO_MAX', updated_at = now()
WHERE UPPER(subscription_tier) IN ('PRO MAX', 'PRO MAX PLAN', 'PRO_MAX_PLAN', 'PROMAX')
  AND subscription_tier != 'PRO_MAX';
