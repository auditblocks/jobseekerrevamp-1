-- Create master_exams table
CREATE TABLE IF NOT EXISTS public.master_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    total_questions INTEGER NOT NULL DEFAULT 100,
    time_minutes INTEGER NOT NULL DEFAULT 120,
    section_distribution JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g., {"Reasoning": 25, "Quant": 25, "English": 25, "GA": 25}
    difficulty_ratio JSONB NOT NULL DEFAULT '{"easy": 30, "medium": 50, "hard": 20}'::jsonb,
    syllabus TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add exam_id to exam_questions to link them to master exams
ALTER TABLE public.exam_questions ADD COLUMN IF NOT EXISTS master_exam_id UUID REFERENCES public.master_exams(id);
ALTER TABLE public.exam_questions ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE public.exam_questions ADD COLUMN IF NOT EXISTS difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard'));
ALTER TABLE public.exam_questions ADD COLUMN IF NOT EXISTS section TEXT;

-- Create previous_year_questions table for analysis
CREATE TABLE IF NOT EXISTS public.previous_year_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_exam_id UUID NOT NULL REFERENCES public.master_exams(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    type question_type NOT NULL DEFAULT 'mcq',
    options JSONB,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    topic TEXT,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    section TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.master_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.previous_year_questions ENABLE ROW LEVEL SECURITY;

-- Policies for master_exams
CREATE POLICY "Anyone can view active master_exams" 
ON public.master_exams FOR SELECT 
USING (is_active = true);

-- Policies for previous_year_questions
CREATE POLICY "Anyone can view previous_year_questions" 
ON public.previous_year_questions FOR SELECT 
USING (true);

-- Functions for admin to manage these
-- (Assuming is_superadmin exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_superadmin') THEN
        EXECUTE 'CREATE POLICY "Admins can manage master_exams" ON public.master_exams FOR ALL USING (public.is_superadmin())';
        EXECUTE 'CREATE POLICY "Admins can manage previous_year_questions" ON public.previous_year_questions FOR ALL USING (public.is_superadmin())';
    END IF;
END $$;

-- Add triggers for updated_at
CREATE TRIGGER update_master_exams_updated_at BEFORE UPDATE ON public.master_exams FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Enable Realtime
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.master_exams;
    EXCEPTION WHEN others THEN 
        RAISE NOTICE 'Skipping adding master_exams to realtime';
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.previous_year_questions;
    EXCEPTION WHEN others THEN 
        RAISE NOTICE 'Skipping adding previous_year_questions to realtime';
    END;
END $$;
