-- ============================================
-- EMAIL COOLDOWN SYSTEM
-- Prevents users from spamming recruiters with 7-day cooldown
-- ============================================

-- ===========================================
-- PART 1: EMAIL COOLDOWNS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS public.email_cooldowns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recruiter_email TEXT NOT NULL,
  blocked_until TIMESTAMP WITH TIME ZONE NOT NULL,
  email_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_cooldowns_user_id ON public.email_cooldowns(user_id);
CREATE INDEX IF NOT EXISTS idx_email_cooldowns_recruiter_email ON public.email_cooldowns(recruiter_email);
CREATE INDEX IF NOT EXISTS idx_email_cooldowns_blocked_until ON public.email_cooldowns(blocked_until);

-- Create unique constraint to prevent duplicate cooldowns
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_cooldowns_user_recruiter 
ON public.email_cooldowns(user_id, recruiter_email);

-- ===========================================
-- PART 2: ROW LEVEL SECURITY (RLS)
-- ===========================================

-- Enable RLS
ALTER TABLE public.email_cooldowns ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own cooldowns
CREATE POLICY "Users can view own cooldowns"
ON public.email_cooldowns FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own cooldowns (via edge functions)
CREATE POLICY "Users can insert own cooldowns"
ON public.email_cooldowns FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own cooldowns
CREATE POLICY "Users can update own cooldowns"
ON public.email_cooldowns FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Admins can view all cooldowns
CREATE POLICY "Admins can view all cooldowns"
ON public.email_cooldowns FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy: Admins can delete any cooldown
CREATE POLICY "Admins can delete cooldowns"
ON public.email_cooldowns FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- ===========================================
-- PART 3: USER NOTIFICATIONS RLS (if not exists)
-- ===========================================

-- Ensure user_notifications has proper RLS policies
DO $$ 
BEGIN
  -- Check if policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_notifications' 
    AND policyname = 'Users can view own notifications'
  ) THEN
    CREATE POLICY "Users can view own notifications"
    ON public.user_notifications FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_notifications' 
    AND policyname = 'Users can update own notifications'
  ) THEN
    CREATE POLICY "Users can update own notifications"
    ON public.user_notifications FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_notifications' 
    AND policyname = 'Service role can insert notifications'
  ) THEN
    CREATE POLICY "Service role can insert notifications"
    ON public.user_notifications FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

-- ===========================================
-- PART 4: HELPER FUNCTIONS
-- ===========================================

-- Function to check if a user can email a recruiter
CREATE OR REPLACE FUNCTION public.can_email_recruiter(
  p_user_id UUID,
  p_recruiter_email TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_blocked_until TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT blocked_until INTO v_blocked_until
  FROM public.email_cooldowns
  WHERE user_id = p_user_id
    AND recruiter_email = LOWER(p_recruiter_email)
    AND blocked_until > NOW();
  
  RETURN v_blocked_until IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get cooldown info for a user and recruiter
CREATE OR REPLACE FUNCTION public.get_cooldown_info(
  p_user_id UUID,
  p_recruiter_email TEXT
)
RETURNS TABLE(
  is_blocked BOOLEAN,
  blocked_until TIMESTAMP WITH TIME ZONE,
  days_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE WHEN ec.blocked_until > NOW() THEN true ELSE false END as is_blocked,
    ec.blocked_until,
    CASE 
      WHEN ec.blocked_until > NOW() THEN 
        CEIL(EXTRACT(EPOCH FROM (ec.blocked_until - NOW())) / 86400)::INTEGER
      ELSE 0
    END as days_remaining
  FROM public.email_cooldowns ec
  WHERE ec.user_id = p_user_id
    AND ec.recruiter_email = LOWER(p_recruiter_email)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- PART 5: COMMENTS
-- ===========================================

COMMENT ON TABLE public.email_cooldowns IS 'Tracks email cooldowns to prevent recruiter spam';
COMMENT ON COLUMN public.email_cooldowns.user_id IS 'User who sent the email';
COMMENT ON COLUMN public.email_cooldowns.recruiter_email IS 'Recruiter email address (lowercase)';
COMMENT ON COLUMN public.email_cooldowns.blocked_until IS 'Timestamp when user can email this recruiter again';
COMMENT ON COLUMN public.email_cooldowns.email_count IS 'Total number of emails sent to this recruiter';
