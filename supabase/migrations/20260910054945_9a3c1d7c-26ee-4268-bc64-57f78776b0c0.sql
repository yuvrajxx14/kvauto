
-- 1. Master
CREATE TABLE public.implement_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  brand text,
  size_spec text,
  suitable_hp text,
  default_price numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.implement_products TO authenticated;
GRANT ALL ON public.implement_products TO service_role;
ALTER TABLE public.implement_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read implement products" ON public.implement_products FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff add implement products" ON public.implement_products FOR INSERT TO authenticated WITH CHECK (public.is_management(auth.uid()));
CREATE POLICY "staff edit implement products" ON public.implement_products FOR UPDATE TO authenticated USING (public.is_management(auth.uid())) WITH CHECK (public.is_management(auth.uid()));
CREATE POLICY "mgmt delete implement products" ON public.implement_products FOR DELETE TO authenticated USING (public.is_management(auth.uid()));
CREATE TRIGGER implement_products_touch BEFORE UPDATE ON public.implement_products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Stock (serial-tracked)
CREATE TABLE public.implement_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.implement_products(id),
  item_name text NOT NULL,
  serial_number text NOT NULL,
  status text NOT NULL DEFAULT 'AVAILABLE',
  purchase_price numeric NOT NULL DEFAULT 0,
  sale_price numeric NOT NULL DEFAULT 0,
  location text NOT NULL DEFAULT 'Main Showroom',
  received_from text,
  arrival_date date,
  remarks text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT implement_stock_status_chk CHECK (status = ANY (ARRAY['AVAILABLE','RESERVED','SOLD']))
);
CREATE UNIQUE INDEX implement_stock_serial_uidx ON public.implement_stock (upper(btrim(serial_number)));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.implement_stock TO authenticated;
GRANT ALL ON public.implement_stock TO service_role;
ALTER TABLE public.implement_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read implement stock" ON public.implement_stock FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff add implement stock" ON public.implement_stock FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff edit implement stock" ON public.implement_stock FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "mgmt delete implement stock" ON public.implement_stock FOR DELETE TO authenticated USING (public.is_management(auth.uid()));
CREATE TRIGGER implement_stock_touch BEFORE UPDATE ON public.implement_stock FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Sales
CREATE TABLE public.implement_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  booking_id uuid REFERENCES public.bookings(id),
  salesman_id uuid,
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  total_amount numeric NOT NULL DEFAULT 0,
  amount_received numeric NOT NULL DEFAULT 0,
  balance numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'OPEN',
  remarks text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT implement_sales_status_chk CHECK (status = ANY (ARRAY['OPEN','PAID','CANCELLED']))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.implement_sales TO authenticated;
GRANT ALL ON public.implement_sales TO service_role;
ALTER TABLE public.implement_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read implement sales" ON public.implement_sales FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff add implement sales" ON public.implement_sales FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff edit implement sales" ON public.implement_sales FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "mgmt delete implement sales" ON public.implement_sales FOR DELETE TO authenticated USING (public.is_management(auth.uid()));
CREATE TRIGGER implement_sales_touch BEFORE UPDATE ON public.implement_sales FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE SEQUENCE IF NOT EXISTS public.implement_sale_seq;

CREATE OR REPLACE FUNCTION public.set_implement_sale_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.sale_number IS NULL OR NEW.sale_number = '' THEN
    NEW.sale_number := 'IMP-' || to_char(COALESCE(NEW.sale_date, CURRENT_DATE), 'YYYY') || '-' ||
                       lpad(nextval('public.implement_sale_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER implement_sales_number BEFORE INSERT ON public.implement_sales
FOR EACH ROW EXECUTE FUNCTION public.set_implement_sale_number();

-- 4. Sale items
CREATE TABLE public.implement_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.implement_sales(id) ON DELETE CASCADE,
  implement_stock_id uuid REFERENCES public.implement_stock(id),
  item_name text NOT NULL,
  serial_number text,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.implement_sale_items TO authenticated;
GRANT ALL ON public.implement_sale_items TO service_role;
ALTER TABLE public.implement_sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read implement sale items" ON public.implement_sale_items FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff add implement sale items" ON public.implement_sale_items FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "mgmt delete implement sale items" ON public.implement_sale_items FOR DELETE TO authenticated USING (public.is_management(auth.uid()));

-- 5. Payments
CREATE TABLE public.implement_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.implement_sales(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_mode text NOT NULL DEFAULT 'Cash',
  reference_number text,
  remarks text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT implement_payments_mode_chk CHECK (payment_mode = ANY (ARRAY['Cash','Bank','UPI','Cheque','Other']))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.implement_payments TO authenticated;
GRANT ALL ON public.implement_payments TO service_role;
ALTER TABLE public.implement_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read implement payments" ON public.implement_payments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff add implement payments" ON public.implement_payments FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

-- 6. Ledger types for implement transactions
ALTER TABLE public.ledger_entries DROP CONSTRAINT IF EXISTS ledger_type_chk;
ALTER TABLE public.ledger_entries ADD CONSTRAINT ledger_type_chk CHECK (
  txn_type = ANY (ARRAY['OPENING','DEAL','BOOKING','ADVANCE','BALANCE','OTHER_CHARGE','OTHER_RECEIPT','REFUND','IMPLEMENT_SALE','IMPLEMENT_RECEIPT'])
);

-- 7. Atomic sale creation
CREATE OR REPLACE FUNCTION public.create_implement_sale_atomic(
  _customer_id uuid,
  _booking_id uuid,
  _salesman_id uuid,
  _sale_date date,
  _remarks text,
  _items jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sale_id uuid;
  _item jsonb;
  _stock public.implement_stock%ROWTYPE;
  _price numeric;
  _total numeric := 0;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised to create implement sales';
  END IF;
  IF _items IS NULL OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'Select at least one implement';
  END IF;

  INSERT INTO public.implement_sales (customer_id, booking_id, salesman_id, sale_date, remarks, created_by)
  VALUES (_customer_id, _booking_id, _salesman_id, COALESCE(_sale_date, CURRENT_DATE), _remarks, auth.uid())
  RETURNING id INTO _sale_id;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO _stock FROM public.implement_stock
      WHERE id = (_item->>'stock_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Implement unit not found';
    END IF;
    IF _stock.status <> 'AVAILABLE' THEN
      RAISE EXCEPTION 'Implement % (%) is no longer available', _stock.item_name, _stock.serial_number;
    END IF;

    _price := COALESCE((_item->>'price')::numeric, _stock.sale_price, 0);
    IF _price <= 0 THEN
      RAISE EXCEPTION 'Enter a price for %', _stock.item_name;
    END IF;

    UPDATE public.implement_stock SET status = 'SOLD' WHERE id = _stock.id;

    INSERT INTO public.implement_sale_items (sale_id, implement_stock_id, item_name, serial_number, price)
    VALUES (_sale_id, _stock.id, _stock.item_name, _stock.serial_number, _price);

    _total := _total + _price;
  END LOOP;

  UPDATE public.implement_sales
     SET total_amount = _total, balance = _total
   WHERE id = _sale_id;

  INSERT INTO public.ledger_entries (customer_id, booking_id, entry_date, txn_type, direction, amount, remarks, created_by)
  VALUES (_customer_id, _booking_id, COALESCE(_sale_date, CURRENT_DATE), 'IMPLEMENT_SALE', 'DEBIT', _total,
          'Implement sale', auth.uid());

  PERFORM public.log_activity('implement_sale', _sale_id, 'CREATE', NULL,
    jsonb_build_object('customer_id', _customer_id, 'total', _total));

  RETURN _sale_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_implement_sale_atomic(uuid, uuid, uuid, date, text, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_implement_sale_atomic(uuid, uuid, uuid, date, text, jsonb) TO authenticated;

-- 8. Atomic payment
CREATE OR REPLACE FUNCTION public.receive_implement_payment_atomic(
  _sale_id uuid,
  _amount numeric,
  _payment_date date,
  _payment_mode text,
  _reference_number text,
  _remarks text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sale public.implement_sales%ROWTYPE;
  _payment_id uuid;
  _received numeric;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised to receive implement payments';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Enter a valid amount';
  END IF;

  SELECT * INTO _sale FROM public.implement_sales WHERE id = _sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sale not found'; END IF;
  IF _sale.status = 'CANCELLED' THEN RAISE EXCEPTION 'This sale is cancelled'; END IF;
  IF _amount > _sale.balance + 1 THEN
    RAISE EXCEPTION 'Amount is more than the outstanding balance';
  END IF;

  INSERT INTO public.implement_payments (sale_id, amount, payment_date, payment_mode, reference_number, remarks, created_by)
  VALUES (_sale_id, _amount, COALESCE(_payment_date, CURRENT_DATE), COALESCE(_payment_mode, 'Cash'), _reference_number, _remarks, auth.uid())
  RETURNING id INTO _payment_id;

  _received := _sale.amount_received + _amount;

  UPDATE public.implement_sales
     SET amount_received = _received,
         balance = GREATEST(0, total_amount - _received),
         status = CASE WHEN total_amount - _received < 1 THEN 'PAID' ELSE 'OPEN' END
   WHERE id = _sale_id;

  INSERT INTO public.ledger_entries (customer_id, booking_id, entry_date, txn_type, direction, amount, payment_mode, reference_number, remarks, created_by)
  VALUES (_sale.customer_id, _sale.booking_id, COALESCE(_payment_date, CURRENT_DATE), 'IMPLEMENT_RECEIPT', 'CREDIT', _amount,
          COALESCE(_payment_mode, 'Cash'), _reference_number, 'Implement payment', auth.uid());

  RETURN _payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.receive_implement_payment_atomic(uuid, numeric, date, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.receive_implement_payment_atomic(uuid, numeric, date, text, text, text) TO authenticated;

-- 9. Seed master
INSERT INTO public.implement_products (name, category, sort_order) VALUES
  ('Rotavator', 'Tillage', 1),
  ('Cultivator', 'Tillage', 2),
  ('Trolley', 'Haulage', 3);
