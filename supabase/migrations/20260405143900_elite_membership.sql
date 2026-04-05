-- Add is_elite_member column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_elite_member BOOLEAN DEFAULT FALSE;
