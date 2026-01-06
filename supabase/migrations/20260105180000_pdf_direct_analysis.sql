-- =====================================================
-- PDF DIRECT ANALYSIS SUPPORT
-- =====================================================
-- Add columns to resume_analyses table for PDF file support

-- Add original file path (storage bucket path)
ALTER TABLE public.resume_analyses
ADD COLUMN IF NOT EXISTS original_file_path TEXT;

-- Add file type (pdf, docx, txt)
ALTER TABLE public.resume_analyses
ADD COLUMN IF NOT EXISTS file_type TEXT CHECK (file_type IN ('pdf', 'docx', 'txt', NULL));

-- Add original file URL (public or signed URL for download)
ALTER TABLE public.resume_analyses
ADD COLUMN IF NOT EXISTS original_file_url TEXT;

-- Add PDF pages data (store formatting info if needed)
ALTER TABLE public.resume_analyses
ADD COLUMN IF NOT EXISTS pdf_pages_data JSONB DEFAULT '{}';

-- Create index for file type
CREATE INDEX IF NOT EXISTS idx_resume_analyses_file_type ON public.resume_analyses(file_type);

-- Create index for original file path
CREATE INDEX IF NOT EXISTS idx_resume_analyses_file_path ON public.resume_analyses(original_file_path);

