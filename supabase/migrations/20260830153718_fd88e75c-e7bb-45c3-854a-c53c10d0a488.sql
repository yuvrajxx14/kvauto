-- ============ EMPLOYEES ============
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_code text NOT NULL UNIQUE,
  full_name text NOT NULL,
  mobile text,
  email text,
  department text NOT NULL DEFAULT 'SALES',
  designation text,
  date_of_joining date NOT NULL DEFAULT CURRENT_DATE,
  date_of_exit date,
  employment_status text NOT NULL DEFAULT 'ACTIVE',
  monthly_salary numeric NOT NULL DEFAULT 0,
  village text,
  tehsil text,
  address text,
  emergency_contact text,
  bank_account text,
  ifsc text,
  onboarding_status text NOT NULL DEFAULT 'IN_PROGRESS',
  remarks text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX employees_user_uidx ON public.employees(user_id) WHERE user_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employees_select" ON public.employees FOR SELECT TO authenticated
  USING (public.is_management(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "employees_insert" ON public.employees FOR INSERT TO authenticated
  WITH CHECK (public.is_management(auth.uid()));
CREATE POLICY "employees_update" ON public.employees FOR UPDATE TO authenticated
  USING (public.is_management(auth.uid())) WITH CHECK (public.is_management(auth.uid()));
CREATE POLICY "employees_delete" ON public.employees FOR DELETE TO authenticated
  USING (public.is_management(auth.uid()));
CREATE TRIGGER trg_employees_touch BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- helper: does the current user own this employee row
CREATE OR REPLACE FUNCTION public.owns_employee(_employee_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.employees e WHERE e.id = _employee_id
    AND (e.user_id = auth.uid() OR public.is_management(auth.uid())));
$$;

CREATE OR REPLACE FUNCTION public.my_employee_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.employees WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ============ ONBOARDING ============
CREATE TABLE public.onboarding_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key text NOT NULL UNIQUE,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'DOCUMENTS',
  is_required boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_checklist TO authenticated;
GRANT ALL ON public.onboarding_checklist TO service_role;
ALTER TABLE public.onboarding_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onb_master_select" ON public.onboarding_checklist FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "onb_master_write" ON public.onboarding_checklist FOR ALL TO authenticated
  USING (public.is_management(auth.uid())) WITH CHECK (public.is_management(auth.uid()));

CREATE TABLE public.employee_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'DOCUMENTS',
  is_done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  remarks text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, item_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_onboarding TO authenticated;
GRANT ALL ON public.employee_onboarding TO service_role;
ALTER TABLE public.employee_onboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emp_onb_select" ON public.employee_onboarding FOR SELECT TO authenticated USING (public.owns_employee(employee_id));
CREATE POLICY "emp_onb_write" ON public.employee_onboarding FOR ALL TO authenticated
  USING (public.is_management(auth.uid())) WITH CHECK (public.is_management(auth.uid()));
CREATE TRIGGER trg_emp_onb_touch BEFORE UPDATE ON public.employee_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ SOPs ============
CREATE TABLE public.sops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  department text NOT NULL DEFAULT 'GENERAL',
  summary text,
  content text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  pass_percent integer NOT NULL DEFAULT 70,
  is_mandatory boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sops TO authenticated;
GRANT ALL ON public.sops TO service_role;
ALTER TABLE public.sops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sops_select" ON public.sops FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "sops_write" ON public.sops FOR ALL TO authenticated
  USING (public.is_management(auth.uid())) WITH CHECK (public.is_management(auth.uid()));
CREATE TRIGGER trg_sops_touch BEFORE UPDATE ON public.sops
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.sop_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id uuid NOT NULL REFERENCES public.sops(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_index integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sop_questions TO authenticated;
GRANT ALL ON public.sop_questions TO service_role;
ALTER TABLE public.sop_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sopq_select" ON public.sop_questions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "sopq_write" ON public.sop_questions FOR ALL TO authenticated
  USING (public.is_management(auth.uid())) WITH CHECK (public.is_management(auth.uid()));

CREATE TABLE public.sop_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id uuid NOT NULL REFERENCES public.sops(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  read_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  score_percent integer,
  passed boolean NOT NULL DEFAULT false,
  passed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sop_id, employee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sop_acknowledgements TO authenticated;
GRANT ALL ON public.sop_acknowledgements TO service_role;
ALTER TABLE public.sop_acknowledgements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sopack_select" ON public.sop_acknowledgements FOR SELECT TO authenticated USING (public.owns_employee(employee_id));
CREATE POLICY "sopack_insert" ON public.sop_acknowledgements FOR INSERT TO authenticated WITH CHECK (public.owns_employee(employee_id));
CREATE POLICY "sopack_update" ON public.sop_acknowledgements FOR UPDATE TO authenticated
  USING (public.owns_employee(employee_id)) WITH CHECK (public.owns_employee(employee_id));
CREATE TRIGGER trg_sopack_touch BEFORE UPDATE ON public.sop_acknowledgements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ ATTENDANCE ============
CREATE TABLE public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  work_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'PRESENT',
  punch_in_at timestamptz,
  punch_in_lat numeric,
  punch_in_lng numeric,
  punch_in_accuracy numeric,
  punch_in_address text,
  punch_out_at timestamptz,
  punch_out_lat numeric,
  punch_out_lng numeric,
  punch_out_accuracy numeric,
  punch_out_address text,
  work_minutes integer NOT NULL DEFAULT 0,
  overtime_minutes integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'SELF',
  remarks text,
  marked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, work_date)
);
CREATE INDEX attendance_date_idx ON public.attendance_records(work_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;
GRANT ALL ON public.attendance_records TO service_role;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "att_select" ON public.attendance_records FOR SELECT TO authenticated USING (public.owns_employee(employee_id));
CREATE POLICY "att_insert" ON public.attendance_records FOR INSERT TO authenticated WITH CHECK (public.owns_employee(employee_id));
CREATE POLICY "att_update" ON public.attendance_records FOR UPDATE TO authenticated
  USING (public.owns_employee(employee_id)) WITH CHECK (public.owns_employee(employee_id));
CREATE POLICY "att_delete" ON public.attendance_records FOR DELETE TO authenticated USING (public.is_management(auth.uid()));
CREATE TRIGGER trg_att_touch BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ PAYROLL ============
CREATE TABLE public.payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_start date NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'DRAFT',
  total_net numeric NOT NULL DEFAULT 0,
  remarks text,
  generated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_runs TO authenticated;
GRANT ALL ON public.payroll_runs TO service_role;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payroll_runs_select" ON public.payroll_runs FOR SELECT TO authenticated USING (public.is_management(auth.uid()) OR public.is_accountant(auth.uid()));
CREATE POLICY "payroll_runs_write" ON public.payroll_runs FOR ALL TO authenticated
  USING (public.is_management(auth.uid())) WITH CHECK (public.is_management(auth.uid()));
CREATE TRIGGER trg_payroll_runs_touch BEFORE UPDATE ON public.payroll_runs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month_start date NOT NULL,
  base_salary numeric NOT NULL DEFAULT 0,
  month_days integer NOT NULL DEFAULT 30,
  paid_days numeric NOT NULL DEFAULT 0,
  present_days numeric NOT NULL DEFAULT 0,
  absent_days numeric NOT NULL DEFAULT 0,
  leave_days numeric NOT NULL DEFAULT 0,
  overtime_hours numeric NOT NULL DEFAULT 0,
  overtime_amount numeric NOT NULL DEFAULT 0,
  allowances numeric NOT NULL DEFAULT 0,
  deductions numeric NOT NULL DEFAULT 0,
  advance numeric NOT NULL DEFAULT 0,
  earned_salary numeric NOT NULL DEFAULT 0,
  net_payable numeric NOT NULL DEFAULT 0,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, employee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payslips TO authenticated;
GRANT ALL ON public.payslips TO service_role;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payslips_select" ON public.payslips FOR SELECT TO authenticated
  USING (public.is_management(auth.uid()) OR public.is_accountant(auth.uid()) OR public.owns_employee(employee_id));
CREATE POLICY "payslips_write" ON public.payslips FOR ALL TO authenticated
  USING (public.is_management(auth.uid())) WITH CHECK (public.is_management(auth.uid()));
CREATE TRIGGER trg_payslips_touch BEFORE UPDATE ON public.payslips
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ ACTIONS ============
CREATE OR REPLACE FUNCTION public.attendance_punch(_kind text, _lat numeric, _lng numeric, _accuracy numeric, _address text, _remarks text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _emp uuid; _id uuid; _rec record;
BEGIN
  SELECT id INTO _emp FROM public.employees WHERE user_id = auth.uid() AND employment_status = 'ACTIVE';
  IF _emp IS NULL THEN RAISE EXCEPTION 'No active employee record is linked to your login. Ask management to link it.'; END IF;

  SELECT * INTO _rec FROM public.attendance_records WHERE employee_id = _emp AND work_date = CURRENT_DATE FOR UPDATE;

  IF _kind = 'IN' THEN
    IF _rec.id IS NOT NULL AND _rec.punch_in_at IS NOT NULL THEN RAISE EXCEPTION 'You have already punched in today'; END IF;
    IF _rec.id IS NULL THEN
      INSERT INTO public.attendance_records (employee_id, work_date, status, punch_in_at, punch_in_lat, punch_in_lng, punch_in_accuracy, punch_in_address, remarks, marked_by, source)
      VALUES (_emp, CURRENT_DATE, 'PRESENT', now(), _lat, _lng, _accuracy, NULLIF(_address,''), NULLIF(_remarks,''), auth.uid(), 'SELF')
      RETURNING id INTO _id;
    ELSE
      UPDATE public.attendance_records SET punch_in_at = now(), punch_in_lat = _lat, punch_in_lng = _lng,
        punch_in_accuracy = _accuracy, punch_in_address = NULLIF(_address,''), status = 'PRESENT', marked_by = auth.uid()
      WHERE id = _rec.id RETURNING id INTO _id;
    END IF;
  ELSIF _kind = 'OUT' THEN
    IF _rec.id IS NULL OR _rec.punch_in_at IS NULL THEN RAISE EXCEPTION 'Punch in first'; END IF;
    IF _rec.punch_out_at IS NOT NULL THEN RAISE EXCEPTION 'You have already punched out today'; END IF;
    UPDATE public.attendance_records
      SET punch_out_at = now(), punch_out_lat = _lat, punch_out_lng = _lng, punch_out_accuracy = _accuracy,
          punch_out_address = NULLIF(_address,''),
          work_minutes = GREATEST(0, (EXTRACT(EPOCH FROM (now() - _rec.punch_in_at)) / 60)::int),
          overtime_minutes = GREATEST(0, (EXTRACT(EPOCH FROM (now() - _rec.punch_in_at)) / 60)::int - 540),
          status = CASE WHEN (EXTRACT(EPOCH FROM (now() - _rec.punch_in_at)) / 60)::int < 240 THEN 'HALF_DAY' ELSE 'PRESENT' END
      WHERE id = _rec.id RETURNING id INTO _id;
  ELSE
    RAISE EXCEPTION 'Invalid punch type';
  END IF;

  PERFORM public.log_activity('attendance', _id, 'Attendance punch ' || _kind, NULL,
    jsonb_build_object('lat', _lat, 'lng', _lng, 'accuracy', _accuracy, 'address', _address));
  RETURN _id;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_payroll(_month_start date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _run uuid; _m date; _days int; _e record;
  _present numeric; _half numeric; _paidleave numeric; _off numeric; _leave numeric; _ot numeric;
  _paid numeric; _earned numeric; _total numeric := 0;
BEGIN
  IF NOT public.is_management(auth.uid()) THEN RAISE EXCEPTION 'Management access only'; END IF;
  _m := date_trunc('month', _month_start)::date;
  _days := EXTRACT(DAY FROM (_m + interval '1 month - 1 day'))::int;

  SELECT id INTO _run FROM public.payroll_runs WHERE month_start = _m;
  IF _run IS NULL THEN
    INSERT INTO public.payroll_runs (month_start, generated_by) VALUES (_m, auth.uid()) RETURNING id INTO _run;
  ELSE
    IF (SELECT status FROM public.payroll_runs WHERE id = _run) = 'PAID' THEN
      RAISE EXCEPTION 'This month is already marked paid';
    END IF;
  END IF;

  FOR _e IN SELECT * FROM public.employees WHERE employment_status = 'ACTIVE' ORDER BY full_name LOOP
    SELECT
      COALESCE(SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END),0),
      COALESCE(SUM(CASE WHEN status = 'HALF_DAY' THEN 1 ELSE 0 END),0),
      COALESCE(SUM(CASE WHEN status = 'PAID_LEAVE' THEN 1 ELSE 0 END),0),
      COALESCE(SUM(CASE WHEN status IN ('WEEKLY_OFF','HOLIDAY') THEN 1 ELSE 0 END),0),
      COALESCE(SUM(CASE WHEN status = 'LEAVE' THEN 1 ELSE 0 END),0),
      COALESCE(SUM(overtime_minutes),0) / 60.0
    INTO _present, _half, _paidleave, _off, _leave, _ot
    FROM public.attendance_records
    WHERE employee_id = _e.id AND work_date >= _m AND work_date < (_m + interval '1 month');

    _paid := _present + (_half * 0.5) + _paidleave + _off;
    _earned := ROUND((_e.monthly_salary / NULLIF(_days,0)) * _paid, 2);

    INSERT INTO public.payslips (run_id, employee_id, month_start, base_salary, month_days, paid_days,
      present_days, absent_days, leave_days, overtime_hours, earned_salary, net_payable)
    VALUES (_run, _e.id, _m, _e.monthly_salary, _days, _paid, _present + (_half * 0.5),
      GREATEST(0, _days - _paid - _leave), _leave, ROUND(_ot,2), _earned, _earned)
    ON CONFLICT (run_id, employee_id) DO UPDATE SET
      base_salary = EXCLUDED.base_salary, month_days = EXCLUDED.month_days, paid_days = EXCLUDED.paid_days,
      present_days = EXCLUDED.present_days, absent_days = EXCLUDED.absent_days, leave_days = EXCLUDED.leave_days,
      overtime_hours = EXCLUDED.overtime_hours, earned_salary = EXCLUDED.earned_salary,
      net_payable = ROUND(EXCLUDED.earned_salary + public.payslips.overtime_amount + public.payslips.allowances
                          - public.payslips.deductions - public.payslips.advance, 2);
  END LOOP;

  SELECT COALESCE(SUM(net_payable),0) INTO _total FROM public.payslips WHERE run_id = _run;
  UPDATE public.payroll_runs SET total_net = _total WHERE id = _run;
  RETURN _run;
END; $$;

REVOKE EXECUTE ON FUNCTION public.owns_employee(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_employee_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.attendance_punch(text, numeric, numeric, numeric, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_payroll(date) FROM anon;

-- default onboarding checklist
INSERT INTO public.onboarding_checklist (item_key, label, category, sort_order) VALUES
  ('AADHAAR','Aadhaar card copy collected','DOCUMENTS',1),
  ('PAN','PAN card copy collected','DOCUMENTS',2),
  ('PHOTO','Passport photos collected','DOCUMENTS',3),
  ('BANK','Bank passbook / cancelled cheque','DOCUMENTS',4),
  ('LICENSE','Driving licence copy (if applicable)','DOCUMENTS',5),
  ('OFFER','Appointment letter signed','PAPERWORK',6),
  ('SALARY','Salary structure explained & agreed','PAPERWORK',7),
  ('BIOMETRIC','ERP login created','SETUP',8),
  ('UNIFORM','Uniform & ID card issued','SETUP',9),
  ('TOUR','Dealership tour & team introduction','TRAINING',10),
  ('SOP_TRAIN','Department SOP training assigned','TRAINING',11),
  ('SAFETY','Workshop safety briefing','TRAINING',12);
