-- Update the is_superadmin function to check user_roles table
CREATE OR REPLACE FUNCTION public.is_superadmin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check user_roles table for admin role
  IF EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RETURN true;
  END IF;
  
  -- Fallback: Check JWT user_metadata for superadmin role
  IF COALESCE((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'superadmin', false) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$function$;