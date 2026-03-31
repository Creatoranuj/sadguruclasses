-- Fix the remaining storage policies that failed
-- Drop duplicates first, then recreate
DROP POLICY IF EXISTS "Users can view own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all course-videos" ON storage.objects;
DROP POLICY IF EXISTS "Enrolled users can view course-videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all course-materials" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view course-materials" ON storage.objects;
DROP POLICY IF EXISTS "Admins and teachers can upload to notices" ON storage.objects;
DROP POLICY IF EXISTS "Admins and teachers can delete from notices" ON storage.objects;

CREATE POLICY "Admins can view all receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all course-videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course-videos' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher')));

CREATE POLICY "Enrolled users can view course-videos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'course-videos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view all course-materials"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course-materials' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher')));

CREATE POLICY "Authenticated users can view course-materials"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'course-materials' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins and teachers can upload to notices"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'notices' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher')));

CREATE POLICY "Admins and teachers can delete from notices"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'notices' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher')));