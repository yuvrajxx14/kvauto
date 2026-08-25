-- Roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'workshop_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'mechanic';

CREATE OR REPLACE FUNCTION public.is_workshop(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('workshop_manager','mechanic','ceo','manager')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_workshop(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_workshop(uuid) TO authenticated;

CREATE SEQUENCE IF NOT EXISTS public.service_job_seq;
CREATE SEQUENCE IF NOT EXISTS public.service_route_seq;

CREATE TABLE public.service_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number text NOT NULL UNIQUE,
  customer_id uuid REFERENCES public.customers(id),
  customer_name text NOT NULL,
  mobile text NOT NULL,
  village text NOT NULL,
  taluka text,
  model text,
  chassis_number text,
  registration_number text,
  hours_reading numeric,
  service_type text NOT NULL DEFAULT 'GENERAL',
  problem_category text,
  service_mode text NOT NULL DEFAULT 'IN_HOUSE',
  priority text NOT NULL DEFAULT 'NORMAL',
  status text NOT NULL DEFAULT 'OPEN',
  assigned_to uuid REFERENCES public.profiles(id),
  received_date date NOT NULL DEFAULT CURRENT_DATE,
  promised_date date,
  completed_date date,
  planned_visit_date date,
  complaint text,
  work_done text,
  parts_details text,
  parts_amount numeric NOT NULL DEFAULT 0,
  labour_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  remarks text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_jobs TO authenticated;
GRANT ALL ON public.service_jobs TO service_role;
ALTER TABLE public.service_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view service jobs" ON public.service_jobs
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Workshop can create service jobs" ON public.service_jobs
  FOR INSERT TO authenticated WITH CHECK (public.is_workshop(auth.uid()) OR public.is_management(auth.uid()));
CREATE POLICY "Workshop can update service jobs" ON public.service_jobs
  FOR UPDATE TO authenticated
  USING (public.is_workshop(auth.uid()) OR public.is_management(auth.uid()) OR assigned_to = auth.uid())
  WITH CHECK (public.is_workshop(auth.uid()) OR public.is_management(auth.uid()) OR assigned_to = auth.uid());
CREATE POLICY "Management can delete service jobs" ON public.service_jobs
  FOR DELETE TO authenticated USING (public.is_management(auth.uid()));

CREATE TABLE public.service_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_number text NOT NULL UNIQUE,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  assigned_to uuid REFERENCES public.profiles(id),
  villages text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'PLANNED',
  remarks text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_routes TO authenticated;
GRANT ALL ON public.service_routes TO service_role;
ALTER TABLE public.service_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view routes" ON public.service_routes
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Workshop can create routes" ON public.service_routes
  FOR INSERT TO authenticated WITH CHECK (public.is_workshop(auth.uid()) OR public.is_management(auth.uid()));
CREATE POLICY "Workshop can update routes" ON public.service_routes
  FOR UPDATE TO authenticated
  USING (public.is_workshop(auth.uid()) OR public.is_management(auth.uid()))
  WITH CHECK (public.is_workshop(auth.uid()) OR public.is_management(auth.uid()));
CREATE POLICY "Management can delete routes" ON public.service_routes
  FOR DELETE TO authenticated USING (public.is_management(auth.uid()));

CREATE TABLE public.service_route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.service_routes(id) ON DELETE CASCADE,
  service_job_id uuid NOT NULL REFERENCES public.service_jobs(id) ON DELETE CASCADE,
  village text NOT NULL,
  visit_order integer NOT NULL DEFAULT 0,
  done boolean NOT NULL DEFAULT false,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_id, service_job_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_route_stops TO authenticated;
GRANT ALL ON public.service_route_stops TO service_role;
ALTER TABLE public.service_route_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view route stops" ON public.service_route_stops
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Workshop can create route stops" ON public.service_route_stops
  FOR INSERT TO authenticated WITH CHECK (public.is_workshop(auth.uid()) OR public.is_management(auth.uid()));
CREATE POLICY "Workshop can update route stops" ON public.service_route_stops
  FOR UPDATE TO authenticated
  USING (public.is_workshop(auth.uid()) OR public.is_management(auth.uid()))
  WITH CHECK (public.is_workshop(auth.uid()) OR public.is_management(auth.uid()));
CREATE POLICY "Management can delete route stops" ON public.service_route_stops
  FOR DELETE TO authenticated USING (public.is_management(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_service_job_defaults()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.job_number IS NULL OR NEW.job_number = '' THEN
    NEW.job_number := 'SRV-' || to_char(now(),'YYMM') || '-' || lpad(nextval('public.service_job_seq')::text, 4, '0');
  END IF;
  IF NEW.service_type = 'PROBLEM' AND NEW.priority = 'NORMAL' THEN
    NEW.priority := 'HIGH';
  END IF;
  NEW.total_amount := COALESCE(NEW.parts_amount,0) + COALESCE(NEW.labour_amount,0);
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_service_job_defaults BEFORE INSERT OR UPDATE ON public.service_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_service_job_defaults();
CREATE TRIGGER trg_service_job_touch BEFORE UPDATE ON public.service_jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.set_service_route_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.route_number IS NULL OR NEW.route_number = '' THEN
    NEW.route_number := 'RT-' || to_char(now(),'YYMM') || '-' || lpad(nextval('public.service_route_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_service_route_number BEFORE INSERT ON public.service_routes
  FOR EACH ROW EXECUTE FUNCTION public.set_service_route_number();
CREATE TRIGGER trg_service_route_touch BEFORE UPDATE ON public.service_routes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_service_jobs_status ON public.service_jobs(status);
CREATE INDEX idx_service_jobs_village ON public.service_jobs(village);
CREATE INDEX idx_service_jobs_type ON public.service_jobs(service_type);