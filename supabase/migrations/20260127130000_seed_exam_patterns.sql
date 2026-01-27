-- Populate master_exams with major Indian government exam patterns

INSERT INTO public.master_exams (name, total_questions, time_minutes, section_distribution, difficulty_ratio, syllabus)
VALUES 
(
    'SSC CGL (Tier 1)', 
    100, 
    60, 
    '{"General Intelligence & Reasoning": 25, "General Awareness": 25, "Quantitative Aptitude": 25, "English Comprehension": 25}'::jsonb,
    '{"easy": 40, "medium": 40, "hard": 20}'::jsonb,
    'General Intelligence, General Awareness, Quantitative Aptitude, English Comprehension'
),
(
    'IBPS PO (Prelims)', 
    100, 
    60, 
    '{"English Language": 30, "Quantitative Aptitude": 35, "Reasoning Ability": 35}'::jsonb,
    '{"easy": 30, "medium": 50, "hard": 20}'::jsonb,
    'English (Grammar, Reading, Vocabulary), Quant (Data Interpretation, Arithmetic), Reasoning (Puzzles, Seating, Coding-Decoding)'
),
(
    'IBPS Clerk (Prelims)', 
    100, 
    60, 
    '{"English Language": 30, "Numerical Ability": 35, "Reasoning Ability": 35}'::jsonb,
    '{"easy": 50, "medium": 40, "hard": 10}'::jsonb,
    'Basic English, Numerical Ability (Speed Math, Arithmetic), Reasoning'
),
(
    'RRB NTPC (CBT-1)', 
    100, 
    90, 
    '{"General Awareness": 40, "Mathematics": 30, "General Intelligence & Reasoning": 30}'::jsonb,
    '{"easy": 45, "medium": 40, "hard": 15}'::jsonb,
    'General Awareness (Current Affairs, History, Science), Mathematics, Reasoning'
),
(
    'SBI PO (Prelims)', 
    100, 
    60, 
    '{"English Language": 30, "Quantitative Aptitude": 35, "Reasoning Ability": 35}'::jsonb,
    '{"easy": 20, "medium": 50, "hard": 30}'::jsonb,
    'High-level Reasoning, Complex DI, Advanced English'
),
(
    'UPSC CSE (Prelims - GS Paper 1)', 
    100, 
    120, 
    '{"History": 15, "Geography": 15, "Polity": 15, "Economy": 15, "Environment & Ecology": 15, "Science & Tech": 10, "Current Affairs": 15}'::jsonb,
    '{"easy": 10, "medium": 40, "hard": 50}'::jsonb,
    'Current events, History of India, Geography, Polity and Governance, Economic and Social Development, General Science'
),
(
    'SSC CHSL (Tier 1)', 
    100, 
    60, 
    '{"English Language": 25, "General Intelligence": 25, "Quantitative Aptitude": 25, "General Awareness": 25}'::jsonb,
    '{"easy": 45, "medium": 40, "hard": 15}'::jsonb,
    'English, General Intelligence, Quant (Arith + Basic Geo/Trig), GA'
)
ON CONFLICT (name) DO UPDATE SET
    total_questions = EXCLUDED.total_questions,
    time_minutes = EXCLUDED.time_minutes,
    section_distribution = EXCLUDED.section_distribution,
    difficulty_ratio = EXCLUDED.difficulty_ratio,
    syllabus = EXCLUDED.syllabus;
