CREATE TABLE public.spare_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number text NOT NULL DEFAULT '',
  request_type text NOT NULL DEFAULT 'MECHANIC',
  service_job_id uuid REFERENCES public.service_jobs(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  requester_name text NOT NULL,
  mobile text,
  model text,
  chassis_number text,
  status text NOT NULL DEFAULT 'PENDING',
  priority text NOT NULL DEFAULT 'NORMAL',
  needed_by date,
  remarks text,
  requested_by uuid REFERENCES public.profiles(id),
  approved_by uuid REFERENCES public.profiles(id),
  issued_by uuid REFERENCES public.profiles(id),
  issued_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.spare_requests TO authenticated;
GRANT ALL ON public.spare_requests TO service_role;
ALTER TABLE public.spare_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view spare requests" ON public.spare_requests
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can create spare requests" ON public.spare_requests
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update spare requests" ON public.spare_requests
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Management can delete spare requests" ON public.spare_requests
  FOR DELETE TO authenticated USING (public.is_management(auth.uid()));

CREATE TABLE public.spare_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.spare_requests(id) ON DELETE CASCADE,
  part_name text NOT NULL,
  part_number text,
  qty_requested numeric NOT NULL DEFAULT 1,
  qty_issued numeric NOT NULL DEFAULT 0,
  rate numeric NOT NULL DEFAULT 0,
  remarks text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.spare_request_items TO authenticated;
GRANT ALL ON public.spare_request_items TO service_role;
ALTER TABLE public.spare_request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view spare request items" ON public.spare_request_items
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can create spare request items" ON public.spare_request_items
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update spare request items" ON public.spare_request_items
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Management can delete spare request items" ON public.spare_request_items
  FOR DELETE TO authenticated USING (public.is_management(auth.uid()));

CREATE INDEX idx_spare_request_items_request ON public.spare_request_items(request_id);
CREATE INDEX idx_spare_requests_status ON public.spare_requests(status);

CREATE OR REPLACE FUNCTION public.set_spare_request_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _prefix text;
  _seq int;
BEGIN
  IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
    _prefix := 'SP-' || to_char(now(), 'YYMM') || '-';
    SELECT COALESCE(MAX(NULLIF(regexp_replace(request_number, '^.*-', ''), '')::int), 0) + 1
      INTO _seq
      FROM public.spare_requests
      WHERE request_number LIKE _prefix || '%';
    NEW.request_number := _prefix || lpad(_seq::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_spare_request_number
  BEFORE INSERT ON public.spare_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_spare_request_number();

CREATE TRIGGER trg_spare_requests_touch
  BEFORE UPDATE ON public.spare_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_spare_request_items_touch
  BEFORE UPDATE ON public.spare_request_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();