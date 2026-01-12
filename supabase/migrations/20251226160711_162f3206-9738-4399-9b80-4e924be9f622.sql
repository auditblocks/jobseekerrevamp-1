DROP POLICY IF EXISTS "Superadmins can view all email tracking" ON public.email_tracking;
CREATE POLICY "Superadmins can view all email tracking"
ON public.email_tracking
FOR SELECT
USING (is_superadmin());