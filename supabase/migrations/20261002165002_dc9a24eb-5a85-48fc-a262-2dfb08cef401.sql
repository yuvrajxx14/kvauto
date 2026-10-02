CREATE TABLE public.monthly_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_start date NOT NULL,
  metric text NOT NULL,
  title text NOT NULL,
  monthly_target numeric NOT NULL DEFAULT 0,
  remarks text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_plans TO authenticated;
GRANT ALL ON public.monthly_plans TO service_role;
ALTER TABLE public.monthly_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff view plans" ON public.monthly_plans FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "mgmt manage plans" ON public.monthly_plans FOR ALL TO authenticated USING (public.is_management(auth.uid())) WITH CHECK (public.is_management(auth.uid()));

CREATE TABLE public.plan_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.monthly_plans(id) ON DELETE CASCADE,
  day date NOT NULL,
  target numeric NOT NULL DEFAULT 0,
  UNIQUE (plan_id, day)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_days TO authenticated;
GRANT ALL ON public.plan_days TO service_role;
ALTER TABLE public.plan_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff view plan days" ON public.plan_days FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "mgmt manage plan days" ON public.plan_days FOR ALL TO authenticated USING (public.is_management(auth.uid())) WITH CHECK (public.is_management(auth.uid()));

CREATE TABLE public.plan_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES public.monthly_plans(id) ON DELETE CASCADE,
  day date NOT NULL,
  assigned_to uuid NOT NULL,
  title text NOT NULL,
  target numeric NOT NULL DEFAULT 1,
  achieved numeric NOT NULL DEFAULT 0,
  done boolean NOT NULL DEFAULT false,
  remarks text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_tasks TO authenticated;
GRANT ALL ON public.plan_tasks TO service_role;
ALTER TABLE public.plan_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own or mgmt tasks" ON public.plan_tasks FOR SELECT TO authenticated USING (assigned_to = auth.uid() OR public.is_management(auth.uid()));
CREATE POLICY "mgmt manage tasks" ON public.plan_tasks FOR ALL TO authenticated USING (public.is_management(auth.uid())) WITH CHECK (public.is_management(auth.uid()));
CREATE POLICY "assignee updates task" ON public.plan_tasks FOR UPDATE TO authenticated USING (assigned_to = auth.uid()) WITH CHECK (assigned_to = auth.uid());

CREATE TRIGGER touch_monthly_plans BEFORE UPDATE ON public.monthly_plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_plan_tasks BEFORE UPDATE ON public.plan_tasks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.passing_records ADD COLUMN IF NOT EXISTS passing_invoice_rate numeric, ADD COLUMN IF NOT EXISTS subsidy_invoice_rate numeric;