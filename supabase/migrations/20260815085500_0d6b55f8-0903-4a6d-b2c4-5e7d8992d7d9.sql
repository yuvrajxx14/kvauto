CREATE OR REPLACE FUNCTION public.create_booking_atomic(_inquiry_id uuid, _final_price numeric, _booking_amount numeric, _booking_date date, _salesman_id uuid, _remarks text, _tractor_model text, _variant text, _payment_mode text DEFAULT 'Cash'::text, _finance_type text DEFAULT 'CASH'::text, _loan_amount numeric DEFAULT 0)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _cust uuid; _bid uuid; _pid uuid; _mode text; _date date; _ft text; _la numeric; _doc numeric;
BEGIN
  IF NOT public.owns_inquiry(_inquiry_id) THEN RAISE EXCEPTION 'Not allowed to book this inquiry'; END IF;
  IF _final_price <= 0 OR _booking_amount <= 0 OR _booking_amount > _final_price THEN
    RAISE EXCEPTION 'Invalid booking amounts';
  END IF;
  SELECT customer_id INTO _cust FROM public.inquiries WHERE id = _inquiry_id;
  IF _cust IS NULL THEN RAISE EXCEPTION 'Inquiry not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.bookings WHERE inquiry_id = _inquiry_id AND status <> 'CANCELLED') THEN
    RAISE EXCEPTION 'This inquiry is already booked';
  END IF;
  _mode := COALESCE(NULLIF(_payment_mode,''),'Cash');
  _date := COALESCE(_booking_date, CURRENT_DATE);
  _ft := COALESCE(NULLIF(_finance_type,''),'CASH');
  _la := COALESCE(_loan_amount,0);
  _doc := CASE WHEN _ft = 'LOAN' THEN round(_la * 0.02) ELSE 0 END;

  INSERT INTO public.bookings (inquiry_id, customer_id, salesman_id, booking_date, tractor_model, variant,
    final_price, booking_amount, amount_received, status, remarks, payment_mode, finance_type, loan_amount,
    extra_charges, doc_charge_posted)
  VALUES (_inquiry_id, _cust, _salesman_id, _date, _tractor_model,
    NULLIF(_variant,''), _final_price, _booking_amount, 0, 'AWAITING_STOCK', NULLIF(_remarks,''), _mode,
    _ft, _la, _doc, _doc > 0)
  RETURNING id INTO _bid;

  INSERT INTO public.ledger_entries (customer_id, booking_id, entry_date, txn_type, direction, amount, remarks, created_by)
  VALUES (_cust, _bid, _date, 'DEAL', 'DEBIT', _final_price, 'Deal price receivable', auth.uid());

  IF _doc > 0 THEN
    INSERT INTO public.ledger_entries (customer_id, booking_id, entry_date, txn_type, direction, amount, remarks, created_by)
    VALUES (_cust, _bid, _date, 'OTHER_CHARGE', 'DEBIT', _doc, 'Loan document charge (2%)', auth.uid());
  END IF;

  INSERT INTO public.booking_payments (booking_id, amount, payment_date, payment_mode, remarks, created_by, payment_type)
  VALUES (_bid, _booking_amount, _date, _mode, 'Booking amount', auth.uid(), 'BOOKING')
  RETURNING id INTO _pid;

  INSERT INTO public.ledger_entries (customer_id, booking_id, payment_id, entry_date, txn_type, direction, amount, payment_mode, remarks, created_by)
  VALUES (_cust, _bid, _pid, _date, 'BOOKING', 'CREDIT', _booking_amount, _mode, 'Booking amount received', auth.uid());

  RETURN _bid;
END; $function$;

-- Backfill existing loan bookings that never had the document charge applied
WITH tgt AS (
  SELECT id, customer_id, booking_date, round(COALESCE(loan_amount,0) * 0.02) AS doc
  FROM public.bookings
  WHERE finance_type = 'LOAN' AND COALESCE(doc_charge_posted,false) = false
    AND status <> 'CANCELLED' AND COALESCE(loan_amount,0) > 0
), ins AS (
  INSERT INTO public.ledger_entries (customer_id, booking_id, entry_date, txn_type, direction, amount, remarks)
  SELECT customer_id, id, booking_date, 'OTHER_CHARGE', 'DEBIT', doc, 'Loan document charge (2%)' FROM tgt
  RETURNING booking_id
)
UPDATE public.bookings b
SET extra_charges = COALESCE(b.extra_charges,0) + t.doc, doc_charge_posted = true
FROM tgt t WHERE b.id = t.id;