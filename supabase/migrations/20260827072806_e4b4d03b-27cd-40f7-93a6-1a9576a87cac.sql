
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_inquiry_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_inquiry_uidx
  ON public.bookings (inquiry_id) WHERE status <> 'CANCELLED';

ALTER TABLE public.customer_documents DROP CONSTRAINT IF EXISTS customer_documents_status_chk;
UPDATE public.customer_documents SET verification_status = 'RECEIVED' WHERE verification_status = 'VERIFIED';
ALTER TABLE public.customer_documents ADD CONSTRAINT customer_documents_status_chk
  CHECK (verification_status = ANY (ARRAY['PENDING','RECEIVED','VERIFIED','REJECTED']));

CREATE OR REPLACE FUNCTION public.complete_delivery_atomic(_booking_id uuid, _delivery_date date, _remarks text, _use_type text DEFAULT 'AGRICULTURE'::text, _application_status text DEFAULT 'PENDING'::text, _approval_status text DEFAULT 'PENDING'::text, _application_date date DEFAULT NULL::date, _approval_date date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _did uuid; _b record; _alloc record; _stock record; _due numeric; _charge numeric; _dd date;
BEGIN
  IF NOT public.owns_booking(_booking_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO _b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF _b.id IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF _b.status = 'DELIVERED' THEN RAISE EXCEPTION 'Booking already delivered'; END IF;
  IF _b.status = 'CANCELLED' THEN RAISE EXCEPTION 'Booking is cancelled'; END IF;
  _dd := COALESCE(_delivery_date, CURRENT_DATE);

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

ALTER TABLE public.spare_requests
  ADD COLUMN IF NOT EXISTS local_checked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS local_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS local_remarks text,
  ADD COLUMN IF NOT EXISTS codealer_checked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS codealer_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS codealer_name text,
  ADD COLUMN IF NOT EXISTS codealer_remarks text,
  ADD COLUMN IF NOT EXISTS order_number text,
  ADD COLUMN IF NOT EXISTS order_date date,
  ADD COLUMN IF NOT EXISTS order_expected_date date,
  ADD COLUMN IF NOT EXISTS order_received_date date;
