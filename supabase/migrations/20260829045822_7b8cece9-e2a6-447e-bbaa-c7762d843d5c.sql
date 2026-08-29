ALTER TABLE public.bookings
  ADD COLUMN insurance_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN insurance_charged boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.charge_loan_insurance_atomic(_booking_id uuid, _amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _b record;
BEGIN
  IF NOT public.owns_booking(_booking_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Insurance amount must be positive'; END IF;
  SELECT * INTO _b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF _b.id IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF _b.finance_type <> 'LOAN' THEN RAISE EXCEPTION 'Insurance charge applies only to loan deals'; END IF;
  IF _b.insurance_charged THEN RAISE EXCEPTION 'Insurance already charged for this booking'; END IF;

  UPDATE public.bookings
    SET extra_charges = extra_charges + _amount,
        insurance_amount = _amount,
        insurance_charged = true
    WHERE id = _booking_id;

  INSERT INTO public.ledger_entries (customer_id, booking_id, entry_date, txn_type, direction, amount, remarks, created_by)
  VALUES (_b.customer_id, _booking_id, CURRENT_DATE, 'OTHER_CHARGE', 'DEBIT', _amount, 'Insurance charge (loan deal)', auth.uid());

  INSERT INTO public.activity_logs(user_id, entity_type, entity_id, action, new_value)
  VALUES (auth.uid(), 'booking', _booking_id, 'Insurance charged', jsonb_build_object('amount', _amount));
END;
$function$;

REVOKE ALL ON FUNCTION public.charge_loan_insurance_atomic(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.charge_loan_insurance_atomic(uuid, numeric) TO authenticated;