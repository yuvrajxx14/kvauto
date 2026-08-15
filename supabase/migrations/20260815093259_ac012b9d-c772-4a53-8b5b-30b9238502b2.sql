CREATE TABLE public.tax_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  invoice_number text NOT NULL UNIQUE,
  prefix text NOT NULL DEFAULT 'A',
  fy_code text NOT NULL,
  month_code text NOT NULL,
  seq integer NOT NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  buyer_name text NOT NULL,
  buyer_address text,
  buyer_mobile text,
  buyer_gstin text,
  place_of_supply text NOT NULL DEFAULT '24-Gujarat',
  hpa_hypo text,
  description text NOT NULL,
  chassis_number text,
  engine_number text,
  hsn_code text NOT NULL DEFAULT '87019200',
  quantity numeric NOT NULL DEFAULT 1,
  rate numeric NOT NULL,
  gst_rate numeric NOT NULL DEFAULT 5,
  taxable_value numeric NOT NULL,
  cgst numeric NOT NULL,
  sgst numeric NOT NULL,
  round_off numeric NOT NULL DEFAULT 0,
  grand_total numeric NOT NULL,
  remarks text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fy_code, month_code, seq)
);

GRANT SELECT, INSERT, UPDATE ON public.tax_invoices TO authenticated;
GRANT ALL ON public.tax_invoices TO service_role;

ALTER TABLE public.tax_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view tax invoices" ON public.tax_invoices
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can create tax invoices" ON public.tax_invoices
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Management can update tax invoices" ON public.tax_invoices
  FOR UPDATE TO authenticated USING (public.is_management(auth.uid())) WITH CHECK (public.is_management(auth.uid()));

CREATE TRIGGER touch_tax_invoices BEFORE UPDATE ON public.tax_invoices
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.issue_tax_invoice(
  _booking_id uuid,
  _invoice_date date,
  _rate numeric,
  _gst_rate numeric,
  _hpa_hypo text,
  _buyer_address text,
  _buyer_gstin text,
  _place_of_supply text,
  _hsn_code text,
  _description text,
  _prefix text DEFAULT 'A'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _b record;
  _alloc record;
  _fy text;
  _mm text;
  _seq integer;
  _num text;
  _taxable numeric;
  _cgst numeric;
  _sgst numeric;
  _total numeric;
  _rounded numeric;
  _id uuid;
  _y integer;
BEGIN
  SELECT b.*, c.customer_name, c.mobile, c.village, c.taluka, c.district, c.address
    INTO _b
  FROM public.bookings b JOIN public.customers c ON c.id = b.customer_id
  WHERE b.id = _booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;

  SELECT * INTO _alloc FROM public.tractor_allocations WHERE booking_id = _booking_id ORDER BY created_at DESC LIMIT 1;

  _y := EXTRACT(YEAR FROM _invoice_date)::int;
  IF EXTRACT(MONTH FROM _invoice_date)::int < 4 THEN _y := _y - 1; END IF;
  _fy := lpad(((_y % 100))::text, 2, '0') || lpad((((_y + 1) % 100))::text, 2, '0');
  _mm := lpad(EXTRACT(MONTH FROM _invoice_date)::int::text, 2, '0');

  PERFORM pg_advisory_xact_lock(hashtext('tax_invoice_series_' || _fy || _mm));
  SELECT COALESCE(MAX(seq), 0) + 1 INTO _seq FROM public.tax_invoices WHERE fy_code = _fy AND month_code = _mm;
  _num := _prefix || '/' || _fy || '/' || _mm || '/' || _seq::text;

  _taxable := ROUND(_rate::numeric, 2);
  _cgst := ROUND(_taxable * _gst_rate / 200.0, 2);
  _sgst := _cgst;
  _total := _taxable + _cgst + _sgst;
  _rounded := ROUND(_total, 0);

  INSERT INTO public.tax_invoices (
    booking_id, customer_id, invoice_number, prefix, fy_code, month_code, seq, invoice_date,
    buyer_name, buyer_address, buyer_mobile, buyer_gstin, place_of_supply, hpa_hypo,
    description, chassis_number, engine_number, hsn_code, rate, gst_rate,
    taxable_value, cgst, sgst, round_off, grand_total, created_by
  ) VALUES (
    _booking_id, _b.customer_id, _num, _prefix, _fy, _mm, _seq, _invoice_date,
    _b.customer_name,
    COALESCE(NULLIF(_buyer_address, ''), concat_ws(', ', _b.address, _b.village, _b.taluka, _b.district)),
    _b.mobile, NULLIF(_buyer_gstin, ''), COALESCE(NULLIF(_place_of_supply, ''), '24-Gujarat'), NULLIF(_hpa_hypo, ''),
    COALESCE(NULLIF(_description, ''), concat_ws(' ', 'MAHINDRA', _b.tractor_model, _b.variant)),
    _alloc.chassis_number, _alloc.engine_number,
    COALESCE(NULLIF(_hsn_code, ''), '87019200'), _taxable, _gst_rate,
    _taxable, _cgst, _sgst, _rounded - _total, _rounded, auth.uid()
  ) RETURNING id INTO _id;

  PERFORM public.log_activity('tax_invoice', _id, 'ISSUED', NULL, jsonb_build_object('invoice_number', _num, 'grand_total', _rounded));
  RETURN _id;
END;
$$;