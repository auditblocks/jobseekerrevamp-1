-- =====================================================
-- RESUME OPTIMIZER TABLES
-- =====================================================

-- =====================================================
-- RESUMES TABLE
-- =====================================================
CREATE TABLE public.resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'txt')),
    file_size INTEGER NOT NULL,
    extracted_text TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_resumes_user_id ON public.resumes(user_id);
CREATE INDEX idx_resumes_is_active ON public.resumes(is_active);
CREATE INDEX idx_resumes_created_at ON public.resumes(created_at);

-- RLS Policies for resumes
CREATE POLICY "Users can view their own resumes"
    ON public.resumes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own resumes"
    ON public.resumes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own resumes"
    ON public.resumes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resumes"
    ON public.resumes FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- RESUME ANALYSES TABLE
-- =====================================================
CREATE TABLE public.resume_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_description TEXT,
    ats_score INTEGER NOT NULL CHECK (ats_score >= 0 AND ats_score <= 100),
    keyword_match_score INTEGER CHECK (keyword_match_score >= 0 AND keyword_match_score <= 100),
    analysis_data JSONB DEFAULT '{}',
    suggestions JSONB DEFAULT '[]',
    missing_keywords TEXT[] DEFAULT '{}',
    matched_keywords TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.resume_analyses ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_resume_analyses_resume_id ON public.resume_analyses(resume_id);
CREATE INDEX idx_resume_analyses_user_id ON public.resume_analyses(user_id);
CREATE INDEX idx_resume_analyses_created_at ON public.resume_analyses(created_at);

-- RLS Policies for resume_analyses
CREATE POLICY "Users can view their own analyses"
    ON public.resume_analyses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analyses"
    ON public.resume_analyses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses"
    ON public.resume_analyses FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses"
    ON public.resume_analyses FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- RESUME VERSIONS TABLE (for version history)
-- =====================================================
CREATE TABLE public.resume_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    analysis_summary JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(resume_id, version_number)
);

ALTER TABLE public.resume_versions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_resume_versions_resume_id ON public.resume_versions(resume_id);
CREATE INDEX idx_resume_versions_created_at ON public.resume_versions(created_at);

-- RLS Policies for resume_versions
CREATE POLICY "Users can view versions of their resumes"
    ON public.resume_versions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.resumes
            WHERE resumes.id = resume_versions.resume_id
            AND resumes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert versions for their resumes"
    ON public.resume_versions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.resumes
            WHERE resumes.id = resume_versions.resume_id
            AND resumes.user_id = auth.uid()
        )
    );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_resumes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for resumes updated_at
CREATE TRIGGER update_resumes_updated_at
    BEFORE UPDATE ON public.resumes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_resumes_updated_at();

-- Function to get user's active resume
CREATE OR REPLACE FUNCTION public.get_active_resume(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    file_url TEXT,
    file_type TEXT,
    file_size INTEGER,
    extracted_text TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.name,
        r.file_url,
        r.file_type,
        r.file_size,
        r.extracted_text,
        r.created_at,
        r.updated_at
    FROM public.resumes r
    WHERE r.user_id = p_user_id
    AND r.is_active = true
    LIMIT 1;
END;
$$;

-- Function to get latest analysis for a resume
CREATE OR REPLACE FUNCTION public.get_latest_resume_analysis(p_resume_id UUID)
RETURNS TABLE (
    id UUID,
    ats_score INTEGER,
    keyword_match_score INTEGER,
    suggestions JSONB,
    missing_keywords TEXT[],
    matched_keywords TEXT[],
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ra.id,
        ra.ats_score,
        ra.keyword_match_score,
        ra.suggestions,
        ra.missing_keywords,
        ra.matched_keywords,
        ra.created_at
    FROM public.resume_analyses ra
    WHERE ra.resume_id = p_resume_id
    ORDER BY ra.created_at DESC
    LIMIT 1;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_active_resume(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_latest_resume_analysis(UUID) TO authenticated;

