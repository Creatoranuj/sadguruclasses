
-- Add target_exam to courses for competitive exam filtering
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS target_exam text;

-- Add class_level and target_exam to profiles for student filtering
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS class_level text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_exam text;
