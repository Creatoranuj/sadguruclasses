
-- Fix handle_new_user to include goal and class_grade
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, goal, class_grade)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'goal',
    new.raw_user_meta_data->>'class_grade'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    goal = COALESCE(EXCLUDED.goal, profiles.goal),
    class_grade = COALESCE(EXCLUDED.class_grade, profiles.class_grade);
  RETURN new;
END;
$$;
