-- 1. Booking columns
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS finance_type text NOT NULL DEFAULT 'CASH',
  ADD COLUMN IF NOT EXISTS loan_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_charges numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS doc_charge_posted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS use_type text NOT NULL DEFAULT 'AGRICULTURE';

-- 2. Booking cancellations
CREATE TABLE IF NOT EXISTS public.booking_cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  cancel_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text NOT NULL,
  refund_amount numeric NOT NULL DEFAULT 0,
  refund_mode text,
  remarks text,
  cancelled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.booking_cancellations TO authenticated;
GRANT ALL ON public.booking_cancellations TO service_role;
ALTER TABLE public.booking_cancellations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cancellations_select" ON public.booking_cancellations;
CREATE POLICY "cancellations_select" ON public.booking_cancellations FOR SELECT TO authenticated
  USING (public.owns_booking(booking_id) OR public.is_receptionist(auth.uid()));
DROP POLICY IF EXISTS "cancellations_insert" ON public.booking_cancellations;
CREATE POLICY "cancellations_insert" ON public.booking_cancellations FOR INSERT TO authenticated
  WITH CHECK (public.owns_booking(booking_id));

-- 3. Subsidy cases
CREATE TABLE IF NOT EXISTS public.subsidy_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  delivery_id uuid REFERENCES public.deliveries(id),
  use_type text NOT NULL DEFAULT 'AGRICULTURE',
  application_status text NOT NULL DEFAULT 'PENDING',
  approval_status text NOT NULL DEFAULT 'PENDING',
  application_date date,
  approval_date date,
  delivery_date date,
  insurance_required boolean NOT NULL DEFAULT false,
  insurance_amount numeric NOT NULL DEFAULT 0,
  insurance_charged boolean NOT NULL DEFAULT false,
  remarks text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.subsidy_cases TO authenticated;
GRANT ALL ON public.subsidy_cases TO service_role;
ALTER TABLE public.subsidy_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subsidy_select" ON public.subsidy_cases;
CREATE POLICY "subsidy_select" ON public.subsidy_cases FOR SELECT TO authenticated
  USING (public.owns_booking(booking_id) OR public.is_receptionist(auth.uid()));
DROP POLICY IF EXISTS "subsidy_insert" ON public.subsidy_cases;
CREATE POLICY "subsidy_insert" ON public.subsidy_cases FOR INSERT TO authenticated
  WITH CHECK (public.owns_booking(booking_id) OR public.is_receptionist(auth.uid()));
DROP POLICY IF EXISTS "subsidy_update" ON public.subsidy_cases;
CREATE POLICY "subsidy_update" ON public.subsidy_cases FOR UPDATE TO authenticated
  USING (public.owns_booking(booking_id) OR public.is_receptionist(auth.uid()))
  WITH CHECK (public.owns_booking(booking_id) OR public.is_receptionist(auth.uid()));
DROP TRIGGER IF EXISTS trg_subsidy_touch ON public.subsidy_cases;
CREATE TRIGGER trg_subsidy_touch BEFORE UPDATE ON public.subsidy_cases
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. Passing records
CREATE TABLE IF NOT EXISTS public.passing_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  invoice_number text,
  invoice_date date,
  form22_printed boolean NOT NULL DEFAULT false,
  sent_to_insurance boolean NOT NULL DEFAULT false,
  insurance_received boolean NOT NULL DEFAULT false,
  insurance_policy_number text,
  set_sent_for_passing boolean NOT NULL DEFAULT false,
  set_sent_date date,
  rto_receipt_received boolean NOT NULL DEFAULT false,
  screen_report_received boolean NOT NULL DEFAULT false,
  rto_number text,
  subsidy_file_created boolean NOT NULL DEFAULT false,
  subsidy_file_date date,
  remarks text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.passing_records TO authenticated;
GRANT ALL ON public.passing_records TO service_role;
ALTER TABLE public.passing_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "passing_select" ON public.passing_records;
CREATE POLICY "passing_select" ON public.passing_records FOR SELECT TO authenticated
  USING (public.owns_booking(booking_id) OR public.is_receptionist(auth.uid()));
DROP POLICY IF EXISTS "passing_insert" ON public.passing_records;
CREATE POLICY "passing_insert" ON public.passing_records FOR INSERT TO authenticated
  WITH CHECK (public.owns_booking(booking_id) OR public.is_receptionist(auth.uid()));
DROP POLICY IF EXISTS "passing_update" ON public.passing_records;
CREATE POLICY "passing_update" ON public.passing_records FOR UPDATE TO authenticated
  USING (public.owns_booking(booking_id) OR public.is_receptionist(auth.uid()))
  WITH CHECK (public.owns_booking(booking_id) OR public.is_receptionist(auth.uid()));
DROP TRIGGER IF EXISTS trg_passing_touch ON public.passing_records;
CREATE TRIGGER trg_passing_touch BEFORE UPDATE ON public.passing_records
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.passing_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passing_id uuid NOT NULL REFERENCES public.passing_records(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  label text NOT NULL,
  provided_by text NOT NULL DEFAULT 'DEALER',
  is_done boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (passing_id, item_key)
);
GRANT SELECT, INSERT, UPDATE ON public.passing_checklist TO authenticated;
GRANT ALL ON public.passing_checklist TO service_role;
ALTER TABLE public.passing_checklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "passing_items_all" ON public.passing_checklist;
CREATE POLICY "passing_items_select" ON public.passing_checklist FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.passing_records p WHERE p.id = passing_id
    AND (public.owns_booking(p.booking_id) OR public.is_receptionist(auth.uid()))));
CREATE POLICY "passing_items_insert" ON public.passing_checklist FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.passing_records p WHERE p.id = passing_id
    AND (public.owns_booking(p.booking_id) OR public.is_receptionist(auth.uid()))));
CREATE POLICY "passing_items_update" ON public.passing_checklist FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.passing_records p WHERE p.id = passing_id
    AND (public.owns_booking(p.booking_id) OR public.is_receptionist(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.passing_records p WHERE p.id = passing_id
    AND (public.owns_booking(p.booking_id) OR public.is_receptionist(auth.uid()))));

-- 5. Booking creation posts the booking receipt
DROP FUNCTION IF EXISTS public.create_booking_atomic(uuid, numeric, numeric, date, uuid, text, text, text);
CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  _inquiry_id uuid, _final_price numeric, _booking_amount numeric, _booking_date date,
  _salesman_id uuid, _remarks text, _tractor_model text, _variant text,
  _payment_mode text DEFAULT 'Cash', _finance_type text DEFAULT 'CASH', _loan_amount numeric DEFAULT 0)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _cust uuid; _bid uuid; _pid uuid; _mode text; _date date;
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

  INSERT INTO public.bookings (inquiry_id, customer_id, salesman_id, booking_date, tractor_model, variant,
    final_price, booking_amount, amount_received, status, remarks, payment_mode, finance_type, loan_amount)
  VALUES (_inquiry_id, _cust, _salesman_id, _date, _tractor_model,
    NULLIF(_variant,''), _final_price, _booking_amount, 0, 'AWAITING_STOCK', NULLIF(_remarks,''), _mode,
    COALESCE(NULLIF(_finance_type,''),'CASH'), COALESCE(_loan_amount,0))
  RETURNING id INTO _bid;

  INSERT INTO public.ledger_entries (customer_id, booking_id, entry_date, txn_type, direction, amount, remarks, created_by)
  VALUES (_cust, _bid, _date, 'DEAL', 'DEBIT', _final_price, 'Deal price receivable', auth.uid());

  INSERT INTO public.booking_payments (booking_id, amount, payment_date, payment_mode, remarks, created_by, payment_type)
  VALUES (_bid, _booking_amount, _date, _mode, 'Booking amount', auth.uid(), 'BOOKING')
  RETURNING id INTO _pid;

  INSERT INTO public.ledger_entries (customer_id, booking_id, payment_id, entry_date, txn_type, direction, amount, payment_mode, remarks, created_by)
  VALUES (_cust, _bid, _pid, _date, 'BOOKING', 'CREDIT', _booking_amount, _mode, 'Booking amount received', auth.uid());

  RETURN _bid;
END; $function$;

-- 6. Extra charge posting (document charge / insurance)
CREATE OR REPLACE FUNCTION public.post_extra_charge_atomic(_booking_id uuid, _amount numeric, _kind text, _remarks text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _cust uuid;
BEGIN
  IF NOT public.owns_booking(_booking_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Charge must be positive'; END IF;
  SELECT customer_id INTO _cust FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF _cust IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  UPDATE public.bookings SET extra_charges = extra_charges + _amount WHERE id = _booking_id;
  INSERT INTO public.ledger_entries (customer_id, booking_id, entry_date, txn_type, direction, amount, remarks, created_by)
  VALUES (_cust, _booking_id, CURRENT_DATE, 'OTHER_CHARGE', 'DEBIT', _amount,
    COALESCE(NULLIF(_remarks,''), _kind), auth.uid());
  INSERT INTO public.activity_logs(user_id, entity_type, entity_id, action, new_value)
  VALUES (auth.uid(), 'booking', _booking_id, 'Charge added', jsonb_build_object('kind', _kind, 'amount', _amount));
END; $function$;

-- 7. Payment cap now includes extra charges
CREATE OR REPLACE FUNCTION public.receive_booking_payment_atomic(_booking_id uuid, _amount numeric, _payment_date date, _payment_mode text, _reference_number text, _remarks text, _payment_type text DEFAULT 'BOOKING'::text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _pid uuid; _cust uuid; _price numeric; _received numeric;
BEGIN
  IF NOT public.owns_booking(_booking_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Payment amount must be positive'; END IF;
  SELECT customer_id, final_price + extra_charges, amount_received INTO _cust, _price, _received
    FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF _cust IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF _amount > (_price - _received + 1) THEN RAISE EXCEPTION 'Payment exceeds outstanding balance'; END IF;

  INSERT INTO public.booking_payments (booking_id, amount, payment_date, payment_mode, reference_number, remarks, created_by, payment_type)
  VALUES (_booking_id, _amount, COALESCE(_payment_date, CURRENT_DATE), COALESCE(NULLIF(_payment_mode,''),'Cash'),
    NULLIF(_reference_number,''), NULLIF(_remarks,''), auth.uid(), COALESCE(NULLIF(_payment_type,''),'BOOKING'))
  RETURNING id INTO _pid;

  INSERT INTO public.ledger_entries (customer_id, booking_id, payment_id, entry_date, txn_type, direction, amount, payment_mode, reference_number, remarks, created_by)
  VALUES (_cust, _booking_id, _pid, COALESCE(_payment_date, CURRENT_DATE), COALESCE(NULLIF(_payment_type,''),'BOOKING'),
    'CREDIT', _amount, COALESCE(NULLIF(_payment_mode,''),'Cash'), NULLIF(_reference_number,''), NULLIF(_remarks,''), auth.uid());

  RETURN _pid;
END; $function$;

-- 8. Cancel booking with refund
CREATE OR REPLACE FUNCTION public.cancel_booking_atomic(_booking_id uuid, _reason text, _refund_amount numeric, _refund_mode text, _remarks text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _cid uuid; _b record; _alloc record;
BEGIN
  IF NOT public.owns_booking(_booking_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO _b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF _b.id IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF _b.status = 'DELIVERED' THEN RAISE EXCEPTION 'Delivered bookings cannot be cancelled'; END IF;
  IF _b.status = 'CANCELLED' THEN RAISE EXCEPTION 'Booking is already cancelled'; END IF;
  IF COALESCE(_refund_amount,0) > _b.amount_received + 1 THEN
    RAISE EXCEPTION 'Refund cannot exceed the amount received';
  END IF;

  SELECT * INTO _alloc FROM public.tractor_allocations WHERE booking_id = _booking_id;
  IF _alloc.id IS NOT NULL THEN
    UPDATE public.tractor_stock SET status = 'AVAILABLE' WHERE id = _alloc.tractor_stock_id;
    DELETE FROM public.tractor_allocations WHERE id = _alloc.id;
  END IF;

  INSERT INTO public.booking_cancellations (booking_id, customer_id, reason, refund_amount, refund_mode, remarks, cancelled_by)
  VALUES (_booking_id, _b.customer_id, _reason, COALESCE(_refund_amount,0), NULLIF(_refund_mode,''), NULLIF(_remarks,''), auth.uid())
  RETURNING id INTO _cid;

  IF COALESCE(_refund_amount,0) > 0 THEN
    INSERT INTO public.ledger_entries (customer_id, booking_id, entry_date, txn_type, direction, amount, payment_mode, remarks, created_by)
    VALUES (_b.customer_id, _booking_id, CURRENT_DATE, 'REFUND', 'DEBIT', _refund_amount, NULLIF(_refund_mode,''), 'Booking cancellation refund', auth.uid());
  END IF;

  UPDATE public.bookings SET status = 'CANCELLED', cancelled_at = now() WHERE id = _booking_id;
  UPDATE public.inquiries SET status = 'LOST' WHERE id = _b.inquiry_id;

  INSERT INTO public.activity_logs(user_id, entity_type, entity_id, action, new_value)
  VALUES (auth.uid(), 'booking', _booking_id, 'Booking cancelled',
    jsonb_build_object('reason', _reason, 'refund_amount', COALESCE(_refund_amount,0)));
  RETURN _cid;
END; $function$;

-- 9. Delivery with use type, finance charge and subsidy case
DROP FUNCTION IF EXISTS public.complete_delivery_atomic(uuid, date, text);
CREATE OR REPLACE FUNCTION public.complete_delivery_atomic(
  _booking_id uuid, _delivery_date date, _remarks text,
  _use_type text DEFAULT 'AGRICULTURE', _application_status text DEFAULT 'PENDING', _approval_status text DEFAULT 'PENDING',
  _application_date date DEFAULT NULL, _approval_date date DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _did uuid; _b record; _alloc record; _stock record; _missing int; _due numeric; _charge numeric; _dd date;
BEGIN
  IF NOT public.owns_booking(_booking_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO _b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF _b.id IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF _b.status = 'DELIVERED' THEN RAISE EXCEPTION 'Booking already delivered'; END IF;
  IF _b.status = 'CANCELLED' THEN RAISE EXCEPTION 'Booking is cancelled'; END IF;
  _dd := COALESCE(_delivery_date, CURRENT_DATE);

  -- loan document charge: 2% of loan amount, posted once
  IF _b.finance_type = 'LOAN' AND COALESCE(_b.loan_amount,0) > 0 AND NOT _b.doc_charge_posted THEN
    _charge := round(_b.loan_amount * 0.02, 2);
    UPDATE public.bookings SET extra_charges = extra_charges + _charge, doc_charge_posted = true WHERE id = _booking_id;
    INSERT INTO public.ledger_entries (customer_id, booking_id, entry_date, txn_type, direction, amount, remarks, created_by)
    VALUES (_b.customer_id, _booking_id, _dd, 'OTHER_CHARGE', 'DEBIT', _charge, 'Loan document charge (2%)', auth.uid());
    SELECT * INTO _b FROM public.bookings WHERE id = _booking_id;
  END IF;

  _due := _b.final_price + COALESCE(_b.extra_charges,0);
  IF _b.amount_received < (_due - 1) THEN
    RAISE EXCEPTION 'DELIVERY BLOCKED: outstanding payment of %', round(_due - _b.amount_received, 2);
  END IF;

  SELECT * INTO _alloc FROM public.tractor_allocations WHERE booking_id = _booking_id;
  IF _alloc.id IS NULL THEN RAISE EXCEPTION 'DELIVERY BLOCKED: tractor not allocated'; END IF;
  SELECT * INTO _stock FROM public.tractor_stock WHERE id = _alloc.tractor_stock_id FOR UPDATE;
  IF _stock.pdi_status <> 'PASSED' THEN RAISE EXCEPTION 'DELIVERY BLOCKED: PDI pending'; END IF;
  IF _stock.inspection_status <> 'PASSED' THEN RAISE EXCEPTION 'DELIVERY BLOCKED: NTIR inspection pending'; END IF;

  SELECT count(*) INTO _missing FROM public.document_checklist dc
   WHERE dc.active AND dc.is_required
     AND NOT EXISTS (SELECT 1 FROM public.customer_documents cd
        WHERE cd.customer_id = _b.customer_id AND cd.doc_type = dc.doc_type AND cd.verification_status = 'VERIFIED');
  IF _missing > 0 THEN RAISE EXCEPTION 'DELIVERY BLOCKED: % required document(s) missing or unverified', _missing; END IF;

  INSERT INTO public.deliveries (booking_id, customer_id, tractor_stock_id, delivery_date, delivered_by, remarks, use_type)
  VALUES (_booking_id, _b.customer_id, _alloc.tractor_stock_id, _dd, auth.uid(), NULLIF(_remarks,''), COALESCE(NULLIF(_use_type,''),'AGRICULTURE'))
  RETURNING id INTO _did;

  UPDATE public.bookings SET status = 'DELIVERED' WHERE id = _booking_id;
  UPDATE public.tractor_stock SET status = 'DELIVERED' WHERE id = _alloc.tractor_stock_id;
  UPDATE public.inquiries SET status = 'DELIVERED' WHERE id = _b.inquiry_id;

  INSERT INTO public.subsidy_cases (booking_id, customer_id, delivery_id, use_type, application_status, approval_status,
    application_date, approval_date, delivery_date, created_by)
  VALUES (_booking_id, _b.customer_id, _did, COALESCE(NULLIF(_use_type,''),'AGRICULTURE'),
    COALESCE(NULLIF(_application_status,''),'PENDING'), COALESCE(NULLIF(_approval_status,''),'PENDING'),
    _application_date, _approval_date, _dd, auth.uid())
  ON CONFLICT (booking_id) DO UPDATE SET delivery_id = EXCLUDED.delivery_id, delivery_date = EXCLUDED.delivery_date,
    use_type = EXCLUDED.use_type, application_status = EXCLUDED.application_status, approval_status = EXCLUDED.approval_status;

  INSERT INTO public.activity_logs(user_id, entity_type, entity_id, action, new_value)
  VALUES (auth.uid(), 'booking', _booking_id, 'Tractor delivered',
    jsonb_build_object('delivery_date', _dd, 'chassis_number', _alloc.chassis_number, 'use_type', _use_type));
  RETURN _did;
END; $function$;
