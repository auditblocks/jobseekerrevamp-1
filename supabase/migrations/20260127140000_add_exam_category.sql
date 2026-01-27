-- Add category column to master_exams
ALTER TABLE public.master_exams ADD COLUMN IF NOT EXISTS category TEXT;

-- Update existing exams with categories
UPDATE public.master_exams SET category = 'SSC' WHERE name IN ('SSC CGL (Tier 1)', 'SSC CHSL (Tier 1)');
UPDATE public.master_exams SET category = 'Banking' WHERE name IN ('IBPS PO (Prelims)', 'IBPS Clerk (Prelims)', 'SBI PO (Prelims)');
UPDATE public.master_exams SET category = 'Railways' WHERE name = 'RRB NTPC (CBT-1)';
UPDATE public.master_exams SET category = 'UPSC' WHERE name = 'UPSC CSE (Prelims - GS Paper 1)';

-- Set a default category for any other exams
UPDATE public.master_exams SET category = 'General' WHERE category IS NULL;

-- Make category NOT NULL for future entries
ALTER TABLE public.master_exams ALTER COLUMN category SET NOT NULL;
