CREATE TABLE public.accessories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  qty_on_hand numeric NOT NULL DEFAULT 0,
  reorder_level numeric NOT NULL DEFAULT 5,
  rate numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accessories TO authenticated;
GRANT ALL ON public.accessories TO service_role;
ALTER TABLE public.accessories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff view accessories" ON public.accessories FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "mgmt/accountant manage accessories" ON public.accessories FOR ALL TO authenticated
  USING (public.is_management(auth.uid()) OR public.is_accountant(auth.uid()))
  WITH CHECK (public.is_management(auth.uid()) OR public.is_accountant(auth.uid()));
CREATE TRIGGER touch_accessories BEFORE UPDATE ON public.accessories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.accessories (name, sort_order) VALUES
 ('Hook',1),('Hood',2),('Bumper',3),('Drawbar',4),('Toplink',5),('Trailer pipe',6),('Toolkit',7);

CREATE TABLE public.account_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_type text NOT NULL CHECK (invoice_type IN ('PURCHASE','SALE')),
  invoice_number text NOT NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  party_name text NOT NULL,
  party_gstin text,
  total_amount numeric NOT NULL DEFAULT 0,
  remarks text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.account_invoices TO authenticated;
GRANT ALL ON public.account_invoices TO service_role;
ALTER TABLE public.account_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounts view invoices" ON public.account_invoices FOR SELECT TO authenticated
  USING (public.is_management(auth.uid()) OR public.is_accountant(auth.uid()));

CREATE TABLE public.account_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.account_invoices(id) ON DELETE CASCADE,
  item_kind text NOT NULL CHECK (item_kind IN ('ACCESSORY','SPARE','OTHER')),
  accessory_id uuid REFERENCES public.accessories(id),
  spare_part_id uuid REFERENCES public.spare_parts(id),
  description text NOT NULL,
  qty numeric NOT NULL,
  rate numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.account_invoice_items TO authenticated;
GRANT ALL ON public.account_invoice_items TO service_role;
ALTER TABLE public.account_invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounts view invoice items" ON public.account_invoice_items FOR SELECT TO authenticated
  USING (public.is_management(auth.uid()) OR public.is_accountant(auth.uid()));

CREATE TABLE public.accessory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accessory_id uuid NOT NULL REFERENCES public.accessories(id),
  movement_type text NOT NULL CHECK (movement_type IN ('IN','OUT','ADJUST')),
  qty numeric NOT NULL,
  reference text,
  booking_id uuid REFERENCES public.bookings(id),
  invoice_id uuid REFERENCES public.account_invoices(id),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.accessory_movements TO authenticated;
GRANT ALL ON public.accessory_movements TO service_role;
ALTER TABLE public.accessory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff view accessory movements" ON public.accessory_movements FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE TABLE public.delivery_accessories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  accessory_id uuid NOT NULL REFERENCES public.accessories(id),
  given boolean NOT NULL DEFAULT false,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, accessory_id)
);
GRANT SELECT ON public.delivery_accessories TO authenticated;
GRANT ALL ON public.delivery_accessories TO service_role;
ALTER TABLE public.delivery_accessories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff view delivery accessories" ON public.delivery_accessories FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.create_account_invoice(_type text, _number text, _date date, _party text, _gstin text, _remarks text, _items jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _id uuid; _it jsonb; _qty numeric; _rate numeric; _total numeric := 0; _acc uuid; _sp uuid; _kind text; _cur numeric;
BEGIN
  IF NOT (public.is_management(auth.uid()) OR public.is_accountant(auth.uid())) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _type NOT IN ('PURCHASE','SALE') THEN RAISE EXCEPTION 'Invalid invoice type'; END IF;
  IF _items IS NULL OR jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'Add at least one item'; END IF;
  INSERT INTO public.account_invoices (invoice_type, invoice_number, invoice_date, party_name, party_gstin, remarks)
  VALUES (_type, _number, COALESCE(_date, CURRENT_DATE), _party, NULLIF(_gstin,''), NULLIF(_remarks,'')) RETURNING id INTO _id;
  FOR _it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _kind := COALESCE(_it->>'kind','OTHER');
    _qty := COALESCE((_it->>'qty')::numeric,0);
    _rate := COALESCE((_it->>'rate')::numeric,0);
    IF _qty <= 0 THEN RAISE EXCEPTION 'Quantity must be greater than zero'; END IF;
    _acc := NULLIF(_it->>'accessory_id','')::uuid;
    _sp := NULLIF(_it->>'spare_part_id','')::uuid;
    INSERT INTO public.account_invoice_items (invoice_id, item_kind, accessory_id, spare_part_id, description, qty, rate, amount)
    VALUES (_id, _kind, _acc, _sp, COALESCE(_it->>'description','Item'), _qty, _rate, _qty*_rate);
    _total := _total + _qty*_rate;
    IF _kind = 'ACCESSORY' AND _acc IS NOT NULL THEN
      SELECT qty_on_hand INTO _cur FROM public.accessories WHERE id = _acc FOR UPDATE;
      IF _type = 'SALE' AND _cur < _qty THEN RAISE EXCEPTION 'Only % in stock for accessory', _cur; END IF;
      UPDATE public.accessories SET qty_on_hand = qty_on_hand + CASE WHEN _type='PURCHASE' THEN _qty ELSE -_qty END WHERE id = _acc;
      INSERT INTO public.accessory_movements (accessory_id, movement_type, qty, reference, invoice_id)
      VALUES (_acc, CASE WHEN _type='PURCHASE' THEN 'IN' ELSE 'OUT' END, _qty, _type || ' ' || _number, _id);
    ELSIF _kind = 'SPARE' AND _sp IS NOT NULL THEN
      SELECT qty_on_hand INTO _cur FROM public.spare_parts WHERE id = _sp FOR UPDATE;
      IF _type = 'SALE' AND _cur < _qty THEN RAISE EXCEPTION 'Only % in stock for spare part', _cur; END IF;
      UPDATE public.spare_parts SET qty_on_hand = qty_on_hand + CASE WHEN _type='PURCHASE' THEN _qty ELSE -_qty END WHERE id = _sp;
      INSERT INTO public.spare_stock_movements (part_id, movement_type, qty, rate, reference, created_by)
      VALUES (_sp, CASE WHEN _type='PURCHASE' THEN 'IN' ELSE 'OUT' END, _qty, _rate, _type || ' ' || _number, auth.uid());
    END IF;
  END LOOP;
  UPDATE public.account_invoices SET total_amount = _total WHERE id = _id;
  PERFORM public.log_activity('account_invoice', _id, _type, NULL, jsonb_build_object('number', _number, 'total', _total));
  RETURN _id;
END; $$;

CREATE OR REPLACE FUNCTION public.record_delivery_accessories(_booking_id uuid, _given uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _a record; _was boolean; _now boolean;
BEGIN
  IF NOT (public.owns_booking(_booking_id) OR public.is_accountant(auth.uid())) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  FOR _a IN SELECT id FROM public.accessories WHERE active LOOP
    SELECT given INTO _was FROM public.delivery_accessories WHERE booking_id = _booking_id AND accessory_id = _a.id;
    _now := _a.id = ANY(COALESCE(_given,'{}'));
    INSERT INTO public.delivery_accessories (booking_id, accessory_id, given) VALUES (_booking_id, _a.id, _now)
    ON CONFLICT (booking_id, accessory_id) DO UPDATE SET given = EXCLUDED.given;
    IF _now AND NOT COALESCE(_was,false) THEN
      UPDATE public.accessories SET qty_on_hand = qty_on_hand - 1 WHERE id = _a.id;
      INSERT INTO public.accessory_movements (accessory_id, movement_type, qty, reference, booking_id) VALUES (_a.id, 'OUT', 1, 'Tractor delivery', _booking_id);
    ELSIF NOT _now AND COALESCE(_was,false) THEN
      UPDATE public.accessories SET qty_on_hand = qty_on_hand + 1 WHERE id = _a.id;
      INSERT INTO public.accessory_movements (accessory_id, movement_type, qty, reference, booking_id) VALUES (_a.id, 'IN', 1, 'Delivery checklist correction', _booking_id);
    END IF;
  END LOOP;
END; $$;

REVOKE EXECUTE ON FUNCTION public.create_account_invoice(text,text,date,text,text,text,jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_delivery_accessories(uuid,uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_account_invoice(text,text,date,text,text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_delivery_accessories(uuid,uuid[]) TO authenticated;