-- =====================================================
-- JOBSEEKER DATABASE SCHEMA - CORE TABLES
-- =====================================================

-- Create user roles enum and table for RBAC (only if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- =====================================================
-- DOMAINS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

-- Insert default domains (only if they don't exist)
DO $$
BEGIN
  INSERT INTO public.domains (name, display_name, description, sort_order) 
  SELECT 'technology', 'Technology', 'Software, IT, and tech roles', 1
  WHERE NOT EXISTS (SELECT 1 FROM public.domains WHERE name = 'technology');
  
  INSERT INTO public.domains (name, display_name, description, sort_order)
  SELECT 'finance', 'Finance', 'Banking, investment, and financial services', 2
  WHERE NOT EXISTS (SELECT 1 FROM public.domains WHERE name = 'finance');
  
  INSERT INTO public.domains (name, display_name, description, sort_order)
  SELECT 'healthcare', 'Healthcare', 'Medical, pharmaceutical, and health services', 3
  WHERE NOT EXISTS (SELECT 1 FROM public.domains WHERE name = 'healthcare');
  
  INSERT INTO public.domains (name, display_name, description, sort_order)
  SELECT 'marketing', 'Marketing', 'Digital marketing, advertising, and PR', 4
  WHERE NOT EXISTS (SELECT 1 FROM public.domains WHERE name = 'marketing');
  
  INSERT INTO public.domains (name, display_name, description, sort_order)
  SELECT 'sales', 'Sales', 'Sales and business development', 5
  WHERE NOT EXISTS (SELECT 1 FROM public.domains WHERE name = 'sales');
  
  INSERT INTO public.domains (name, display_name, description, sort_order)
  SELECT 'operations', 'Operations', 'Operations and supply chain management', 6
  WHERE NOT EXISTS (SELECT 1 FROM public.domains WHERE name = 'operations');
  
  INSERT INTO public.domains (name, display_name, description, sort_order)
  SELECT 'hr', 'Human Resources', 'HR and talent acquisition', 7
  WHERE NOT EXISTS (SELECT 1 FROM public.domains WHERE name = 'hr');
  
  INSERT INTO public.domains (name, display_name, description, sort_order)
  SELECT 'legal', 'Legal', 'Legal and compliance roles', 8
  WHERE NOT EXISTS (SELECT 1 FROM public.domains WHERE name = 'legal');
  
  INSERT INTO public.domains (name, display_name, description, sort_order)
  SELECT 'education', 'Education', 'Teaching and academic roles', 9
  WHERE NOT EXISTS (SELECT 1 FROM public.domains WHERE name = 'education');
  
  INSERT INTO public.domains (name, display_name, description, sort_order)
  SELECT 'other', 'Other', 'Other job categories', 10
  WHERE NOT EXISTS (SELECT 1 FROM public.domains WHERE name = 'other');
END $$;

-- =====================================================
-- SUBDOMAINS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subdomains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subdomains ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_subdomains_domain_id ON public.subdomains(domain_id);
CREATE INDEX IF NOT EXISTS idx_subdomains_is_active ON public.subdomains(is_active);

-- =====================================================
-- PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'superadmin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned', 'suspended')),
    subscription_tier TEXT NOT NULL DEFAULT 'FREE' CHECK (subscription_tier IN ('FREE', 'PRO', 'PRO_MAX')),
    subscription_expires_at TIMESTAMPTZ,
    daily_emails_sent INTEGER NOT NULL DEFAULT 0,
    last_sent_date DATE,
    total_emails_sent INTEGER NOT NULL DEFAULT 0,
    successful_emails INTEGER NOT NULL DEFAULT 0,
    failed_emails INTEGER NOT NULL DEFAULT 0,
    job_domains JSONB DEFAULT '[]'::jsonb,
    preferences JSONB DEFAULT '{"jobDomains": [], "gmailAddress": null, "resume": null}'::jsonb,
    google_refresh_token TEXT,
    gmail_token_refreshed_at TIMESTAMPTZ,
    phone TEXT,
    location TEXT,
    professional_title TEXT,
    bio TEXT,
    linkedin_url TEXT,
    portfolio_url TEXT,
    profile_photo_url TEXT,
    permissions TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON public.profiles(subscription_tier);

-- =====================================================
-- SUBSCRIPTION PLANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    display_name TEXT,
    description TEXT,
    price INTEGER NOT NULL,
    old_price INTEGER,
    duration_unit TEXT NOT NULL DEFAULT 'days',
    duration_days INTEGER NOT NULL DEFAULT 0,
    daily_limit INTEGER NOT NULL DEFAULT 0,
    features TEXT[] NOT NULL DEFAULT '{}',
    is_recommended BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    button_text TEXT,
    button_disabled_text TEXT,
    is_active BOOLEAN DEFAULT true,
    billing_cycle_display TEXT,
    discount_percentage INTEGER,
    max_features INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Insert default plans
INSERT INTO public.subscription_plans (id, name, display_name, price, duration_days, daily_limit, features, is_recommended, sort_order, button_text) VALUES
('FREE', 'Free', 'Free Plan', 0, 0, 5, ARRAY['5 emails per day', 'Basic templates', 'Email tracking'], false, 1, 'Current Plan'),
('PRO', 'Pro', 'Pro Plan', 999, 30, 50, ARRAY['50 emails per day', 'All templates', 'Advanced analytics', 'Priority support'], true, 2, 'Upgrade to Pro'),
('PRO_MAX', 'Pro Max', 'Pro Max Plan', 1999, 30, 100, ARRAY['100 emails per day', 'All templates', 'Advanced analytics', 'Priority support', 'AI-powered suggestions', 'Custom branding'], false, 3, 'Upgrade to Pro Max');

-- =====================================================
-- SUBSCRIPTION HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
    amount INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_method TEXT,
    payment_id TEXT,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON public.subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_plan_id ON public.subscription_history(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_status ON public.subscription_history(status);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON public.subscription_history(created_at);

-- =====================================================
-- RECRUITERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.recruiters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    domain TEXT,
    subdomain_id UUID REFERENCES public.subdomains(id),
    tier TEXT CHECK (tier IN ('FREE', 'PRO', 'PRO_MAX')),
    quality_score NUMERIC DEFAULT 0,
    response_rate NUMERIC DEFAULT 0,
    company TEXT,
    last_contacted TIMESTAMPTZ,
    scraped_at TIMESTAMPTZ,
    source_platform TEXT,
    company_size TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.recruiters ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_recruiters_email ON public.recruiters(email);
CREATE INDEX IF NOT EXISTS idx_recruiters_domain ON public.recruiters(domain);
CREATE INDEX IF NOT EXISTS idx_recruiters_subdomain_id ON public.recruiters(subdomain_id);
CREATE INDEX IF NOT EXISTS idx_recruiters_tier ON public.recruiters(tier);
CREATE INDEX IF NOT EXISTS idx_recruiters_scraped_at ON public.recruiters(scraped_at);
CREATE INDEX IF NOT EXISTS idx_recruiters_source_platform ON public.recruiters(source_platform);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Superadmin check function
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
BEGIN
  IF COALESCE((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'superadmin', false) THEN
    RETURN true;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND COALESCE(auth.users.raw_user_meta_data->>'role', 'user') = 'superadmin'
  );
END;
$$;

-- Get tier limits function
CREATE OR REPLACE FUNCTION public.get_tier_limits()
RETURNS TABLE(
    tier TEXT,
    limit_per_category INTEGER
)
LANGUAGE sql
STABLE
AS $$
    SELECT 'FREE'::TEXT, 5::INTEGER
    UNION ALL
    SELECT 'PRO'::TEXT, 30::INTEGER
    UNION ALL
    SELECT 'PRO_MAX'::TEXT, 60::INTEGER;
$$;

-- =====================================================
-- RLS POLICIES FOR CORE TABLES
-- =====================================================

-- User roles policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Users can view own roles') THEN
    CREATE POLICY "Users can view own roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Domains policies (public read)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'domains' AND policyname = 'Anyone can view active domains') THEN
    CREATE POLICY "Anyone can view active domains"
    ON public.domains FOR SELECT
    USING (is_active = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'domains' AND policyname = 'Superadmins can manage domains') THEN
    CREATE POLICY "Superadmins can manage domains"
    ON public.domains FOR ALL
    TO authenticated
    USING (public.is_superadmin())
    WITH CHECK (public.is_superadmin());
  END IF;
END $$;

-- Subdomains policies (public read)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subdomains' AND policyname = 'Anyone can view active subdomains') THEN
    CREATE POLICY "Anyone can view active subdomains"
    ON public.subdomains FOR SELECT
    USING (is_active = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subdomains' AND policyname = 'Superadmins can manage subdomains') THEN
    CREATE POLICY "Superadmins can manage subdomains"
    ON public.subdomains FOR ALL
    TO authenticated
    USING (public.is_superadmin())
    WITH CHECK (public.is_superadmin());
  END IF;
END $$;

-- Profiles policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile') THEN
    CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile') THEN
    CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Superadmins can manage all profiles') THEN
    CREATE POLICY "Superadmins can manage all profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.is_superadmin())
    WITH CHECK (public.is_superadmin());
  END IF;
END $$;

-- Subscription plans policies (public read)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_plans' AND policyname = 'Anyone can view active plans') THEN
    CREATE POLICY "Anyone can view active plans"
    ON public.subscription_plans FOR SELECT
    USING (is_active = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_plans' AND policyname = 'Superadmins can manage plans') THEN
    CREATE POLICY "Superadmins can manage plans"
    ON public.subscription_plans FOR ALL
    TO authenticated
    USING (public.is_superadmin())
    WITH CHECK (public.is_superadmin());
  END IF;
END $$;

-- Subscription history policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_history' AND policyname = 'Users can view own subscription history') THEN
    CREATE POLICY "Users can view own subscription history"
    ON public.subscription_history FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_history' AND policyname = 'Users can insert own subscription history') THEN
    CREATE POLICY "Users can insert own subscription history"
    ON public.subscription_history FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_history' AND policyname = 'Superadmins can view all subscription history') THEN
    CREATE POLICY "Superadmins can view all subscription history"
    ON public.subscription_history FOR SELECT
    TO authenticated
    USING (public.is_superadmin());
  END IF;
END $$;

-- Recruiters policies (authenticated read based on tier)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recruiters' AND policyname = 'Authenticated users can view recruiters') THEN
    CREATE POLICY "Authenticated users can view recruiters"
    ON public.recruiters FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recruiters' AND policyname = 'Superadmins can manage recruiters') THEN
    CREATE POLICY "Superadmins can manage recruiters"
    ON public.recruiters FOR ALL
    TO authenticated
    USING (public.is_superadmin())
    WITH CHECK (public.is_superadmin());
  END IF;
END $$;

-- =====================================================
-- PROFILE TRIGGER FOR NEW USERS
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;