CREATE OR REPLACE FUNCTION public.complete_delivery_atomic(_booking_id uuid, _delivery_date date, _remarks text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _did uuid; _b record; _alloc record; _stock record; _missing int;
BEGIN
  IF NOT public.owns_booking(_booking_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO _b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF _b.id IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF _b.status = 'DELIVERED' THEN RAISE EXCEPTION 'Booking already delivered'; END IF;
  -- allow sub-rupee rounding differences
  IF _b.amount_received < (_b.final_price - 1) THEN RAISE EXCEPTION 'DELIVERY BLOCKED: outstanding payment'; END IF;

  SELECT * INTO _alloc FROM public.tractor_allocations WHERE booking_id = _booking_id;
  IF _alloc.id IS NULL THEN RAISE EXCEPTION 'DELIVERY BLOCKED: tractor not allocated'; END IF;
  SELECT * INTO _stock FROM public.tractor_stock WHERE id = _alloc.tractor_stock_id FOR UPDATE;
  IF _stock.pdi_status <> 'PASSED' THEN RAISE EXCEPTION 'DELIVERY BLOCKED: PDI pending'; END IF;
  IF _stock.delivery_check_status <> 'PASSED' THEN RAISE EXCEPTION 'DELIVERY BLOCKED: delivery check pending'; END IF;

  SELECT count(*) INTO _missing FROM public.document_checklist dc
   WHERE dc.active AND dc.is_required
     AND NOT EXISTS (SELECT 1 FROM public.customer_documents cd
        WHERE cd.customer_id = _b.customer_id AND cd.doc_type = dc.doc_type AND cd.verification_status = 'VERIFIED');
  IF _missing > 0 THEN RAISE EXCEPTION 'DELIVERY BLOCKED: % required document(s) missing or unverified', _missing; END IF;

  INSERT INTO public.deliveries (booking_id, customer_id, tractor_stock_id, delivery_date, delivered_by, remarks)
  VALUES (_booking_id, _b.customer_id, _alloc.tractor_stock_id, COALESCE(_delivery_date, CURRENT_DATE), auth.uid(), NULLIF(_remarks,''))
  RETURNING id INTO _did;

  UPDATE public.bookings SET status = 'DELIVERED' WHERE id = _booking_id;
  UPDATE public.tractor_stock SET status = 'DELIVERED' WHERE id = _alloc.tractor_stock_id;
  UPDATE public.inquiries SET status = 'DELIVERED' WHERE id = _b.inquiry_id;

  INSERT INTO public.activity_logs(user_id, entity_type, entity_id, action, new_value)
  VALUES (auth.uid(), 'booking', _booking_id, 'Tractor delivered',
    jsonb_build_object('delivery_date', COALESCE(_delivery_date, CURRENT_DATE), 'chassis_number', _alloc.chassis_number));
  RETURN _did;
END; $function$;

CREATE OR REPLACE FUNCTION public.receive_booking_payment_atomic(_booking_id uuid, _amount numeric, _payment_date date, _payment_mode text, _reference_number text, _remarks text, _payment_type text DEFAULT 'BOOKING'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _pid uuid; _cust uuid; _price numeric; _received numeric;
BEGIN
  IF NOT public.owns_booking(_booking_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Payment amount must be positive'; END IF;
  SELECT customer_id, final_price, amount_received INTO _cust, _price, _received
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