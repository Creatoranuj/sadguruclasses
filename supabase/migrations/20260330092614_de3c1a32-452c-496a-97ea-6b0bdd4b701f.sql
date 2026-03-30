
-- Add category to courses for goal-based filtering
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS category text DEFAULT 'general';

-- Add goal and class_grade to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS goal text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS class_grade text;

-- Update the handle_new_user trigger to copy goal and class_grade from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, goal, class_grade)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'goal',
    NEW.raw_user_meta_data->>'class_grade'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    goal = COALESCE(EXCLUDED.goal, profiles.goal),
    class_grade = COALESCE(EXCLUDED.class_grade, profiles.class_grade);
  RETURN NEW;
END;
$$;
