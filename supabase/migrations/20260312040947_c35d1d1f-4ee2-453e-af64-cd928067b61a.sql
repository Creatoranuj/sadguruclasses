
-- Error logs table for client-side error monitoring
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL DEFAULT 'client_js',
  message TEXT NOT NULL,
  stack_trace TEXT,
  url TEXT,
  user_id UUID,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT false,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent actions audit trail
CREATE TABLE IF NOT EXISTS public.agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL DEFAULT 'suggestion',
  description TEXT NOT NULL,
  related_error_id UUID REFERENCES public.error_logs(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  result TEXT,
  executed_by TEXT DEFAULT 'agent',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent configuration (singleton)
CREATE TABLE IF NOT EXISTS public.agent_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  enabled BOOLEAN DEFAULT true,
  auto_fix_level TEXT DEFAULT 'minor',
  notify_admin_on TEXT DEFAULT 'critical',
  webhook_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config
INSERT INTO public.agent_config (id, enabled) VALUES (1, true) ON CONFLICT (id) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON public.error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_agent_actions_created_at ON public.agent_actions(created_at DESC);

-- RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_config ENABLE ROW LEVEL SECURITY;

-- Anyone can insert error logs (even anon for client errors)
CREATE POLICY "Anyone can insert error logs" ON public.error_logs FOR INSERT TO public WITH CHECK (true);
-- Only admins can view/manage error logs
CREATE POLICY "Admins can manage error logs" ON public.error_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- Only admins can view/manage agent actions
CREATE POLICY "Admins can manage agent actions" ON public.agent_actions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- Only admins can manage agent config
CREATE POLICY "Admins can manage agent config" ON public.agent_config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
