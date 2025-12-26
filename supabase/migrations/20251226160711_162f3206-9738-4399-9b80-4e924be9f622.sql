-- Add superadmin policy to email_tracking for analytics
CREATE POLICY "Superadmins can view all email tracking"
ON public.email_tracking
FOR SELECT
USING (is_superadmin());