
-- RLS policies for chapters
CREATE POLICY "Admins full access on chapters"
  ON public.chapters FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read chapters"
  ON public.chapters FOR SELECT
  TO authenticated
  USING (true);

-- RLS policies for lessons
CREATE POLICY "Admins full access on lessons"
  ON public.lessons FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read lessons"
  ON public.lessons FOR SELECT
  TO authenticated
  USING (true);

-- RLS policies for courses
CREATE POLICY "Admins full access on courses"
  ON public.courses FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read courses"
  ON public.courses FOR SELECT
  TO authenticated
  USING (true);

-- RLS policies for enrollments
CREATE POLICY "Admins full access on enrollments"
  ON public.enrollments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own enrollments"
  ON public.enrollments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS policies for user_progress
CREATE POLICY "Users manage own progress"
  ON public.user_progress FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all progress"
  ON public.user_progress FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for lesson_pdfs
CREATE POLICY "Admins full access on lesson_pdfs"
  ON public.lesson_pdfs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read lesson_pdfs"
  ON public.lesson_pdfs FOR SELECT
  TO authenticated
  USING (true);

-- RLS policies for lesson_likes
CREATE POLICY "Users manage own likes"
  ON public.lesson_likes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read likes"
  ON public.lesson_likes FOR SELECT
  TO authenticated
  USING (true);

-- RLS policies for comments
CREATE POLICY "Authenticated can read comments"
  ON public.comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create comments"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins full access on comments"
  ON public.comments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS policies for profiles
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "System can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS policies for quizzes
CREATE POLICY "Authenticated can read published quizzes"
  ON public.quizzes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins full access on quizzes"
  ON public.quizzes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS policies for questions
CREATE POLICY "Authenticated can read questions"
  ON public.questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins full access on questions"
  ON public.questions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS policies for quiz_attempts
CREATE POLICY "Users manage own quiz attempts"
  ON public.quiz_attempts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all quiz attempts"
  ON public.quiz_attempts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for notices
CREATE POLICY "Authenticated can read notices"
  ON public.notices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins full access on notices"
  ON public.notices FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS policies for materials
CREATE POLICY "Authenticated can read materials"
  ON public.materials FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins full access on materials"
  ON public.materials FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS policies for hero_banners
CREATE POLICY "Anyone can read hero_banners"
  ON public.hero_banners FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins full access on hero_banners"
  ON public.hero_banners FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS policies for user_roles
CREATE POLICY "Users can read own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins full access on user_roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- System insert for triggers
CREATE POLICY "System insert user_roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS for lecture_notes
CREATE POLICY "Users manage own lecture_notes"
  ON public.lecture_notes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS for student_notes
CREATE POLICY "Users manage own student_notes"
  ON public.student_notes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS for doubts
CREATE POLICY "Users can create doubts"
  ON public.doubts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated can read doubts"
  ON public.doubts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins full access on doubts"
  ON public.doubts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS for payment_requests
CREATE POLICY "Users can create payment_requests"
  ON public.payment_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own payment_requests"
  ON public.payment_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins full access on payment_requests"
  ON public.payment_requests FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS for messages
CREATE POLICY "Users can read own messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Admins full access on messages"
  ON public.messages FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS for chatbot_logs
CREATE POLICY "Users can insert chatbot_logs"
  ON public.chatbot_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read own chatbot_logs"
  ON public.chatbot_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS for chatbot_feedback
CREATE POLICY "Users can insert chatbot_feedback"
  ON public.chatbot_feedback FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS for chatbot_settings (admin only)
CREATE POLICY "Admins full access on chatbot_settings"
  ON public.chatbot_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read chatbot_settings"
  ON public.chatbot_settings FOR SELECT
  TO authenticated
  USING (true);

-- RLS for knowledge_base
CREATE POLICY "Authenticated can read knowledge_base"
  ON public.knowledge_base FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins full access on knowledge_base"
  ON public.knowledge_base FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS for landing_content (public read)
CREATE POLICY "Anyone can read landing_content"
  ON public.landing_content FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins full access on landing_content"
  ON public.landing_content FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS for books (public read)
CREATE POLICY "Anyone can read books"
  ON public.books FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins full access on books"
  ON public.books FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS for leads (public insert for landing page)
CREATE POLICY "Anyone can insert leads"
  ON public.leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS for razorpay_payments
CREATE POLICY "Users can read own razorpay_payments"
  ON public.razorpay_payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins full access on razorpay_payments"
  ON public.razorpay_payments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS for lecture_schedules
CREATE POLICY "Authenticated can read lecture_schedules"
  ON public.lecture_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins full access on lecture_schedules"
  ON public.lecture_schedules FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS for doubt_sessions
CREATE POLICY "Users can create doubt_sessions"
  ON public.doubt_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users can read own doubt_sessions"
  ON public.doubt_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Admins full access on doubt_sessions"
  ON public.doubt_sessions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
