CREATE TABLE public.service_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_job_id uuid NOT NULL REFERENCES public.service_jobs(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  label text NOT NULL,
  is_done boolean NOT NULL DEFAULT false,
  remarks text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_job_id, item_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_checklist TO authenticated;
GRANT ALL ON public.service_checklist TO service_role;

ALTER TABLE public.service_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view service checklist"
ON public.service_checklist FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can add service checklist items"
ON public.service_checklist FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update service checklist items"
ON public.service_checklist FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Management can delete service checklist items"
ON public.service_checklist FOR DELETE TO authenticated
USING (public.is_management(auth.uid()));

CREATE TRIGGER service_checklist_touch
BEFORE UPDATE ON public.service_checklist
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();