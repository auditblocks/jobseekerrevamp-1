-- Create enum for question types
CREATE TYPE question_type AS ENUM ('mcq', 'fill_blank');

-- Create exam_questions table
CREATE TABLE IF NOT EXISTS public.exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.govt_jobs(id) ON DELETE CASCADE,
    type question_type NOT NULL DEFAULT 'mcq',
    question_text TEXT NOT NULL,
    options JSONB, -- For MCQs: ['Option A', 'Option B', ...]
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_exams table (test sessions)
CREATE TABLE IF NOT EXISTS public.user_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES public.govt_jobs(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_exam_responses table
CREATE TABLE IF NOT EXISTS public.user_exam_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_exam_id UUID NOT NULL REFERENCES public.user_exams(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.exam_questions(id) ON DELETE CASCADE,
    selected_answer TEXT,
    is_correct BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_exam_responses ENABLE ROW LEVEL SECURITY;

-- exam_questions Policies
-- Anyone can view questions (to take the test)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'exam_questions' AND policyname = 'Anyone can view exam_questions'
    ) THEN
        CREATE POLICY "Anyone can view exam_questions" 
        ON public.exam_questions FOR SELECT 
        USING (true);
    END IF;
END $$;

-- Only admins can manage exam_questions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_superadmin') AND NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'exam_questions' AND policyname = 'Admins can manage exam_questions'
    ) THEN
        EXECUTE 'CREATE POLICY "Admins can manage exam_questions" ON public.exam_questions FOR ALL USING (public.is_superadmin())';
    END IF;
END $$;

-- user_exams Policies
-- Users can manage their own exam sessions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_exams' AND policyname = 'Users can manage their own exams'
    ) THEN
        CREATE POLICY "Users can manage their own exams" 
        ON public.user_exams FOR ALL 
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- user_exam_responses Policies
-- Users can manage their own responses via user_exams link
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_exam_responses' AND policyname = 'Users can manage their own exam responses'
    ) THEN
        CREATE POLICY "Users can manage their own exam responses" 
        ON public.user_exam_responses FOR ALL 
        USING (
            EXISTS (
                SELECT 1 FROM public.user_exams
                WHERE public.user_exams.id = user_exam_id
                AND public.user_exams.user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- Add updated_at trigger
CREATE TRIGGER update_exam_questions_updated_at BEFORE UPDATE ON public.exam_questions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_user_exams_updated_at BEFORE UPDATE ON public.user_exams FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_exams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_exam_responses;
