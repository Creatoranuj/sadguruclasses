
CREATE TABLE public.telegram_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  file_id text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text DEFAULT 'application/pdf',
  uploaded_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.telegram_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view telegram files"
  ON public.telegram_files FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage telegram files"
  ON public.telegram_files FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
