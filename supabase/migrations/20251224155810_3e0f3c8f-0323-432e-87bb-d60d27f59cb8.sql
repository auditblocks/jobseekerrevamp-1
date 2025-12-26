-- Fix search_path for functions that need it
CREATE OR REPLACE FUNCTION public.get_tier_limits()
RETURNS TABLE(
    tier TEXT,
    limit_per_category INTEGER
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT 'FREE'::TEXT, 5::INTEGER
    UNION ALL
    SELECT 'PRO'::TEXT, 30::INTEGER
    UNION ALL
    SELECT 'PRO_MAX'::TEXT, 60::INTEGER;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  RETURN new;
END;
$$;