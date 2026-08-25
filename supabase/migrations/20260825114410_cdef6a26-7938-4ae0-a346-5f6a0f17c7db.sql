CREATE TABLE public.gate_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gatepass_number text NOT NULL UNIQUE,
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  model text,
  variant text,
  chassis_number text,
  engine_number text,
  remarks text,
  issued_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.gate_passes TO authenticated;
GRANT ALL ON public.gate_passes TO service_role;

ALTER TABLE public.gate_passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gate passes readable by staff" ON public.gate_passes
FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "gate passes created by owner or management" ON public.gate_passes
FOR INSERT TO authenticated
WITH CHECK (public.is_management(auth.uid()) OR public.owns_booking(booking_id));

CREATE TRIGGER gate_passes_touch BEFORE UPDATE ON public.gate_passes
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.issue_gate_pass(_booking_id uuid, _issue_date date DEFAULT CURRENT_DATE, _remarks text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b public.bookings%ROWTYPE;
  a public.tractor_allocations%ROWTYPE;
  _due numeric;
  _seq int;
  _num text;
  _id uuid;
BEGIN
  IF NOT (public.is_management(auth.uid()) OR public.owns_booking(_booking_id)) THEN
    RAISE EXCEPTION 'Not allowed to issue a gate pass for this booking';
  END IF;

  SELECT * INTO b FROM public.bookings WHERE id = _booking_id;
  IF b.id IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF b.status = 'CANCELLED' THEN RAISE EXCEPTION 'Booking is cancelled'; END IF;

  _due := COALESCE(b.final_price,0) + COALESCE(b.extra_charges,0)
        + CASE WHEN b.finance_type = 'LOAN' AND NOT COALESCE(b.doc_charge_posted,false)
               THEN ROUND(COALESCE(b.loan_amount,0) * 0.02) ELSE 0 END;

  IF (_due - COALESCE(b.amount_received,0)) >= 1 THEN
    RAISE EXCEPTION 'Full payment not received. Outstanding %', ROUND(_due - COALESCE(b.amount_received,0), 2);
  END IF;

  SELECT * INTO a FROM public.tractor_allocations WHERE booking_id = _booking_id ORDER BY created_at DESC LIMIT 1;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Allocate a tractor before issuing the gate pass'; END IF;

  SELECT COUNT(*) + 1 INTO _seq FROM public.gate_passes
    WHERE to_char(created_at, 'YYMM') = to_char(now(), 'YYMM');
  _num := 'GP-' || to_char(now(), 'YYMM') || '-' || lpad(_seq::text, 4, '0');

  INSERT INTO public.gate_passes (gatepass_number, booking_id, customer_id, issue_date, model, variant, chassis_number, engine_number, remarks, issued_by)
  VALUES (_num, _booking_id, b.customer_id, COALESCE(_issue_date, CURRENT_DATE), COALESCE(a.model, b.tractor_model), COALESCE(a.variant, b.variant), a.chassis_number, a.engine_number, _remarks, auth.uid())
  RETURNING id INTO _id;

  PERFORM public.log_activity('gate_pass', _id, 'ISSUED', NULL, jsonb_build_object('booking_id', _booking_id, 'gatepass_number', _num));
  RETURN _id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.issue_gate_pass(uuid, date, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.issue_gate_pass(uuid, date, text) TO authenticated;