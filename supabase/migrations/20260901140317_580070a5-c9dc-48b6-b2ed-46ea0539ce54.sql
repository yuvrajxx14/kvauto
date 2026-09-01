CREATE OR REPLACE FUNCTION public.generate_payroll(_month_start date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _run uuid; _m date; _days int; _e record;
  _present numeric; _half numeric; _paidleave numeric; _off numeric; _leave numeric; _ot numeric;
  _early int; _late int; _allow numeric; _deduct numeric;
  _paid numeric; _earned numeric; _net numeric; _total numeric := 0;
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
      COALESCE(SUM(overtime_minutes),0) / 60.0,
      COALESCE(SUM(CASE WHEN punch_in_at IS NOT NULL AND status IN ('PRESENT','HALF_DAY')
        AND (punch_in_at AT TIME ZONE 'Asia/Kolkata')::time < TIME '08:30' THEN 1 ELSE 0 END),0),
      COALESCE(SUM(CASE WHEN punch_in_at IS NOT NULL AND status IN ('PRESENT','HALF_DAY')
        AND (punch_in_at AT TIME ZONE 'Asia/Kolkata')::time >= TIME '08:30' THEN 1 ELSE 0 END),0)
    INTO _present, _half, _paidleave, _off, _leave, _ot, _early, _late
    FROM public.attendance_records
    WHERE employee_id = _e.id AND work_date >= _m AND work_date < (_m + interval '1 month');

    _paid := _present + (_half * 0.5) + _paidleave + _off;
    _earned := ROUND((_e.monthly_salary / NULLIF(_days,0)) * _paid, 2);
    _allow := _early * 50;
    _deduct := _late * 50;
    _net := GREATEST(0, ROUND(COALESCE(_earned,0) + _allow - _deduct, 2));

    INSERT INTO public.payslips (run_id, employee_id, month_start, base_salary, month_days, paid_days,
      present_days, absent_days, leave_days, overtime_hours, allowances, deductions, earned_salary, net_payable, remarks)
    VALUES (_run, _e.id, _m, _e.monthly_salary, _days, _paid, _present + (_half * 0.5),
      GREATEST(0, _days - _paid - _leave), _leave, ROUND(_ot,2), _allow, _deduct, _earned, _net,
      _early || ' early days (+' || _allow || '), ' || _late || ' late days (-' || _deduct || ')')
    ON CONFLICT (run_id, employee_id) DO UPDATE SET
      base_salary = EXCLUDED.base_salary, month_days = EXCLUDED.month_days, paid_days = EXCLUDED.paid_days,
      present_days = EXCLUDED.present_days, absent_days = EXCLUDED.absent_days, leave_days = EXCLUDED.leave_days,
      overtime_hours = EXCLUDED.overtime_hours, allowances = EXCLUDED.allowances, deductions = EXCLUDED.deductions,
      earned_salary = EXCLUDED.earned_salary, net_payable = EXCLUDED.net_payable, remarks = EXCLUDED.remarks,
      updated_at = now();

    _total := _total + _net;
  END LOOP;

  UPDATE public.payroll_runs SET total_net = _total, updated_at = now() WHERE id = _run;
  RETURN _run;
END; $$;

REVOKE EXECUTE ON FUNCTION public.generate_payroll(date) FROM anon;