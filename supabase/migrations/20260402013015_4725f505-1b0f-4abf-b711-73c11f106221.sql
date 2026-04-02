
-- Enable RLS on all tables that have policies
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_pdfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.razorpay_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubt_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_participants ENABLE ROW LEVEL SECURITY;

-- Add basic policies for remaining tables that need them
-- attendance
CREATE POLICY "Authenticated can read attendance" ON public.attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins full access on attendance" ON public.attendance FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- audit_log
CREATE POLICY "Admins can read audit_log" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert audit_log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- notes
CREATE POLICY "Authenticated can read notes" ON public.notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins full access on notes" ON public.notes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- live_sessions
CREATE POLICY "Authenticated can read live_sessions" ON public.live_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins full access on live_sessions" ON public.live_sessions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- live_messages
CREATE POLICY "Authenticated can read live_messages" ON public.live_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert live_messages" ON public.live_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- live_participants
CREATE POLICY "Authenticated can read live_participants" ON public.live_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own live_participants" ON public.live_participants FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
