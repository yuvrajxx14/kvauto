-- 1. Loosen enums into checked text
ALTER TABLE public.bookings ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.bookings ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE public.bookings ALTER COLUMN status SET DEFAULT 'BOOKED';
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_chk CHECK (status IN ('BOOKED','AWAITING_STOCK','STOCK_AVAILABLE','ALLOCATED','READY_FOR_DELIVERY','DELIVERED','CANCELLED'));
ALTER TABLE public.bookings ALTER COLUMN payment_mode TYPE text USING payment_mode::text;
ALTER TABLE public.booking_payments ALTER COLUMN payment_mode DROP DEFAULT;
ALTER TABLE public.booking_payments ALTER COLUMN payment_mode TYPE text USING payment_mode::text;
ALTER TABLE public.booking_payments ALTER COLUMN payment_mode SET DEFAULT 'Cash';
ALTER TABLE public.booking_payments ADD CONSTRAINT booking_payments_mode_chk CHECK (payment_mode IN ('Cash','Bank','UPI','Cheque','Other'));
ALTER TABLE public.booking_payments ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'BOOKING';
ALTER TABLE public.booking_payments ADD CONSTRAINT booking_payments_type_chk CHECK (payment_type IN ('BOOKING','ADVANCE','BALANCE','OTHER','REFUND'));

ALTER TABLE public.tractor_stock ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.tractor_stock ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE public.tractor_stock ALTER COLUMN status SET DEFAULT 'AVAILABLE';
ALTER TABLE public.tractor_stock ADD CONSTRAINT tractor_stock_status_chk CHECK (status IN ('ORDERED','IN_TRANSIT','RECEIVED','INSPECTION_PENDING','PDI_PENDING','AVAILABLE','RESERVED','ALLOCATED','DELIVERED'));

CREATE OR REPLACE FUNCTION public.before_allocation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE st text;
BEGIN
  SELECT status INTO st FROM public.tractor_stock WHERE id = NEW.tractor_stock_id FOR UPDATE;
  IF st IS DISTINCT FROM 'AVAILABLE' THEN
    RAISE EXCEPTION 'Tractor is not available for allocation';
  END IF;
  UPDATE public.tractor_stock SET status = 'RESERVED' WHERE id = NEW.tractor_stock_id;
  RETURN NEW;
END; $$;

-- 2. Stock enrichment
ALTER TABLE public.tractor_stock
  ADD COLUMN IF NOT EXISTS colour text,
  ADD COLUMN IF NOT EXISTS mfg_year text,
  ADD COLUMN IF NOT EXISTS arrival_date date,
  ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT 'Main Showroom',
  ADD COLUMN IF NOT EXISTS branch text NOT NULL DEFAULT 'Main',
  ADD COLUMN IF NOT EXISTS order_reference text,
  ADD COLUMN IF NOT EXISTS order_id uuid,
  ADD COLUMN IF NOT EXISTS inspection_status text NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS pdi_status text NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS delivery_check_status text NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS inspection_remarks text,
  ADD COLUMN IF NOT EXISTS pdi_remarks text,
  ADD COLUMN IF NOT EXISTS delivery_check_remarks text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.tractor_stock ADD CONSTRAINT stock_inspection_chk CHECK (inspection_status IN ('PENDING','PASSED','FAILED'));
ALTER TABLE public.tractor_stock ADD CONSTRAINT stock_pdi_chk CHECK (pdi_status IN ('PENDING','PASSED','FAILED'));
ALTER TABLE public.tractor_stock ADD CONSTRAINT stock_delcheck_chk CHECK (delivery_check_status IN ('PENDING','PASSED','FAILED'));
CREATE UNIQUE INDEX IF NOT EXISTS tractor_stock_chassis_uq ON public.tractor_stock (chassis_number);
CREATE TRIGGER trg_stock_touch BEFORE UPDATE ON public.tractor_stock FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Model stock config
CREATE TABLE public.model_stock_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model text NOT NULL UNIQUE,
  min_regular_stock integer NOT NULL DEFAULT 0,
  branch text NOT NULL DEFAULT 'Main',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_stock_config TO authenticated;
GRANT ALL ON public.model_stock_config TO service_role;
ALTER TABLE public.model_stock_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cfg select" ON public.model_stock_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "cfg insert" ON public.model_stock_config FOR INSERT TO authenticated WITH CHECK (public.is_management(auth.uid()));
CREATE POLICY "cfg update" ON public.model_stock_config FOR UPDATE TO authenticated USING (public.is_management(auth.uid()));
CREATE POLICY "cfg delete" ON public.model_stock_config FOR DELETE TO authenticated USING (public.is_management(auth.uid()));
CREATE TRIGGER trg_cfg_touch BEFORE UPDATE ON public.model_stock_config FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. Tractor orders
CREATE SEQUENCE IF NOT EXISTS public.order_seq;
CREATE TABLE public.tractor_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  model text NOT NULL,
  variant text,
  quantity integer NOT NULL DEFAULT 1,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_arrival_date date,
  status text NOT NULL DEFAULT 'DRAFT',
  branch text NOT NULL DEFAULT 'Main',
  supplier text,
  remarks text,
  created_by uuid,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tractor_orders_status_chk CHECK (status IN ('DRAFT','APPROVED','ORDERED','IN_TRANSIT','RECEIVED','CANCELLED'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tractor_orders TO authenticated;
GRANT ALL ON public.tractor_orders TO service_role;
ALTER TABLE public.tractor_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders select" ON public.tractor_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "orders insert" ON public.tractor_orders FOR INSERT TO authenticated WITH CHECK (public.is_management(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "orders update" ON public.tractor_orders FOR UPDATE TO authenticated USING (public.is_management(auth.uid()));
CREATE TRIGGER trg_order_touch BEFORE UPDATE ON public.tractor_orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'ORD-' || to_char(now(),'YYMM') || '-' || lpad(nextval('public.order_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_order_number BEFORE INSERT ON public.tractor_orders FOR EACH ROW EXECUTE FUNCTION public.set_order_number();

-- 5. Customer ownership helper
CREATE OR REPLACE FUNCTION public.owns_customer(_customer_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.customers c WHERE c.id = _customer_id
    AND (public.is_management(auth.uid()) OR c.assigned_salesman_id = auth.uid() OR c.created_by = auth.uid()
         OR EXISTS (SELECT 1 FROM public.inquiries i WHERE i.customer_id = c.id AND i.salesman_id = auth.uid())));
$$;

-- 6. Customer ledger (transaction based)
CREATE TABLE public.ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  booking_id uuid REFERENCES public.bookings(id),
  payment_id uuid REFERENCES public.booking_payments(id),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  txn_type text NOT NULL,
  direction text NOT NULL,
  amount numeric NOT NULL,
  payment_mode text,
  reference_number text,
  remarks text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ledger_direction_chk CHECK (direction IN ('DEBIT','CREDIT')),
  CONSTRAINT ledger_type_chk CHECK (txn_type IN ('OPENING','DEAL','BOOKING','ADVANCE','BALANCE','OTHER_CHARGE','OTHER_RECEIPT','REFUND'))
);
GRANT SELECT, INSERT ON public.ledger_entries TO authenticated;
GRANT ALL ON public.ledger_entries TO service_role;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ledger select" ON public.ledger_entries FOR SELECT TO authenticated USING (public.owns_customer(customer_id));
CREATE POLICY "ledger insert" ON public.ledger_entries FOR INSERT TO authenticated WITH CHECK (public.is_management(auth.uid()) AND created_by = auth.uid());
CREATE INDEX ledger_customer_idx ON public.ledger_entries (customer_id, entry_date);

-- 7. Deliveries
CREATE TABLE public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  tractor_stock_id uuid NOT NULL REFERENCES public.tractor_stock(id),
  delivery_date date NOT NULL DEFAULT CURRENT_DATE,
  delivered_by uuid,
  odometer_hours numeric,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.deliveries TO authenticated;
GRANT ALL ON public.deliveries TO service_role;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deliveries select" ON public.deliveries FOR SELECT TO authenticated USING (public.owns_booking(booking_id));
CREATE POLICY "deliveries insert" ON public.deliveries FOR INSERT TO authenticated WITH CHECK (public.owns_booking(booking_id) AND delivered_by = auth.uid());

-- 8. Documents
CREATE TABLE public.document_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  doc_type text NOT NULL UNIQUE,
  label text NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  has_number boolean NOT NULL DEFAULT false,
  has_expiry boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_checklist TO authenticated;
GRANT ALL ON public.document_checklist TO service_role;
ALTER TABLE public.document_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checklist select" ON public.document_checklist FOR SELECT TO authenticated USING (true);
CREATE POLICY "checklist insert" ON public.document_checklist FOR INSERT TO authenticated WITH CHECK (public.is_management(auth.uid()));
CREATE POLICY "checklist update" ON public.document_checklist FOR UPDATE TO authenticated USING (public.is_management(auth.uid()));
CREATE POLICY "checklist delete" ON public.document_checklist FOR DELETE TO authenticated USING (public.is_management(auth.uid()));

INSERT INTO public.document_checklist (category, doc_type, label, is_required, has_number, has_expiry, sort_order) VALUES
 ('IDENTITY','AADHAAR','Aadhaar Card', true, true, false, 1),
 ('IDENTITY','PAN','PAN Card', true, true, false, 2),
 ('LAND','7_12','7/12 Extract', true, false, false, 3),
 ('LAND','8A','8A Extract', true, false, false, 4),
 ('LAND','OTHER_LAND','Other Land Document', false, false, false, 5),
 ('BANK','CANCELLED_CHEQUE','Cancelled Cheque', true, false, false, 6),
 ('BANK','PASSBOOK','Bank Passbook', false, false, false, 7),
 ('BANK','BANK_DETAILS','Bank Details', false, false, false, 8),
 ('SALES','BOOKING_DOC','Booking Document', true, false, false, 9),
 ('SALES','PURCHASE_DOC','Purchase Document', true, false, false, 10),
 ('SALES','OTHER_DEALERSHIP','Other Dealership Document', false, false, false, 11);

CREATE TABLE public.customer_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  doc_type text NOT NULL,
  file_path text,
  file_name text,
  document_number text,
  expiry_date date,
  verification_status text NOT NULL DEFAULT 'PENDING',
  remarks text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_documents_status_chk CHECK (verification_status IN ('PENDING','VERIFIED','REJECTED'))
);
GRANT SELECT, INSERT, UPDATE ON public.customer_documents TO authenticated;
GRANT ALL ON public.customer_documents TO service_role;
ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "docs select" ON public.customer_documents FOR SELECT TO authenticated USING (public.owns_customer(customer_id));
CREATE POLICY "docs insert" ON public.customer_documents FOR INSERT TO authenticated WITH CHECK (public.owns_customer(customer_id) AND uploaded_by = auth.uid());
CREATE POLICY "docs update" ON public.customer_documents FOR UPDATE TO authenticated USING (public.owns_customer(customer_id));
CREATE TRIGGER trg_docs_touch BEFORE UPDATE ON public.customer_documents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 9. Booking / payment / allocation / delivery operations
CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  _inquiry_id uuid, _final_price numeric, _booking_amount numeric, _booking_date date,
  _salesman_id uuid, _remarks text, _tractor_model text, _variant text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _cust uuid; _bid uuid;
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

  INSERT INTO public.bookings (inquiry_id, customer_id, salesman_id, booking_date, tractor_model, variant,
    final_price, booking_amount, amount_received, status, remarks)
  VALUES (_inquiry_id, _cust, _salesman_id, COALESCE(_booking_date, CURRENT_DATE), _tractor_model,
    NULLIF(_variant,''), _final_price, _booking_amount, 0, 'AWAITING_STOCK', NULLIF(_remarks,''))
  RETURNING id INTO _bid;

  INSERT INTO public.ledger_entries (customer_id, booking_id, entry_date, txn_type, direction, amount, remarks, created_by)
  VALUES (_cust, _bid, COALESCE(_booking_date, CURRENT_DATE), 'DEAL', 'DEBIT', _final_price, 'Deal price receivable', auth.uid());

  RETURN _bid;
END; $$;

CREATE OR REPLACE FUNCTION public.receive_booking_payment_atomic(
  _booking_id uuid, _amount numeric, _payment_date date, _payment_mode text,
  _reference_number text, _remarks text, _payment_type text DEFAULT 'BOOKING')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _pid uuid; _cust uuid; _price numeric; _received numeric;
BEGIN
  IF NOT public.owns_booking(_booking_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Payment amount must be positive'; END IF;
  SELECT customer_id, final_price, amount_received INTO _cust, _price, _received
    FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF _cust IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF _amount > (_price - _received) THEN RAISE EXCEPTION 'Payment exceeds outstanding balance'; END IF;

  INSERT INTO public.booking_payments (booking_id, amount, payment_date, payment_mode, reference_number, remarks, created_by, payment_type)
  VALUES (_booking_id, _amount, COALESCE(_payment_date, CURRENT_DATE), COALESCE(NULLIF(_payment_mode,''),'Cash'),
    NULLIF(_reference_number,''), NULLIF(_remarks,''), auth.uid(), COALESCE(NULLIF(_payment_type,''),'BOOKING'))
  RETURNING id INTO _pid;

  INSERT INTO public.ledger_entries (customer_id, booking_id, payment_id, entry_date, txn_type, direction, amount, payment_mode, reference_number, remarks, created_by)
  VALUES (_cust, _booking_id, _pid, COALESCE(_payment_date, CURRENT_DATE), COALESCE(NULLIF(_payment_type,''),'BOOKING'),
    'CREDIT', _amount, COALESCE(NULLIF(_payment_mode,''),'Cash'), NULLIF(_reference_number,''), NULLIF(_remarks,''), auth.uid());

  RETURN _pid;
END; $$;

CREATE OR REPLACE FUNCTION public.allocate_tractor_atomic(_booking_id uuid, _tractor_stock_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _aid uuid; _cust uuid; _st record;
BEGIN
  IF NOT public.owns_booking(_booking_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT customer_id INTO _cust FROM public.bookings WHERE id = _booking_id;
  IF _cust IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.tractor_allocations WHERE booking_id = _booking_id) THEN
    RAISE EXCEPTION 'Booking already has an allocated tractor';
  END IF;
  SELECT * INTO _st FROM public.tractor_stock WHERE id = _tractor_stock_id FOR UPDATE;
  IF _st.id IS NULL THEN RAISE EXCEPTION 'Tractor not found'; END IF;
  IF _st.status <> 'AVAILABLE' THEN RAISE EXCEPTION 'Tractor is not available for allocation'; END IF;

  INSERT INTO public.tractor_allocations (booking_id, customer_id, tractor_stock_id, chassis_number, engine_number, model, variant, allocated_by)
  VALUES (_booking_id, _cust, _tractor_stock_id, _st.chassis_number, _st.engine_number, _st.model, _st.variant, auth.uid())
  RETURNING id INTO _aid;

  UPDATE public.tractor_stock SET status = 'ALLOCATED' WHERE id = _tractor_stock_id;
  UPDATE public.bookings SET status = 'ALLOCATED' WHERE id = _booking_id;
  RETURN _aid;
END; $$;

CREATE OR REPLACE FUNCTION public.complete_delivery_atomic(_booking_id uuid, _delivery_date date, _remarks text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _did uuid; _b record; _alloc record; _stock record; _missing int;
BEGIN
  IF NOT public.owns_booking(_booking_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO _b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF _b.id IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF _b.status = 'DELIVERED' THEN RAISE EXCEPTION 'Booking already delivered'; END IF;
  IF _b.amount_received < _b.final_price THEN RAISE EXCEPTION 'DELIVERY BLOCKED: outstanding payment'; END IF;

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
END; $$;

GRANT EXECUTE ON FUNCTION public.create_booking_atomic(uuid,numeric,numeric,date,uuid,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.receive_booking_payment_atomic(uuid,numeric,date,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_tractor_atomic(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_delivery_atomic(uuid,date,text) TO authenticated;

-- 10. Salesman FK for profile joins
ALTER TABLE public.bookings ADD CONSTRAINT bookings_salesman_id_fkey FOREIGN KEY (salesman_id) REFERENCES public.profiles(id);