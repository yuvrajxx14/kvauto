
CREATE TABLE public.spare_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number text NOT NULL,
  part_name text NOT NULL,
  category text,
  brand text,
  rack_location text,
  purchase_rate numeric NOT NULL DEFAULT 0,
  sale_rate numeric NOT NULL DEFAULT 0,
  qty_on_hand numeric NOT NULL DEFAULT 0,
  min_qty numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'NOS',
  remarks text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.spare_parts TO authenticated;
GRANT ALL ON public.spare_parts TO service_role;
ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX spare_parts_number_uidx ON public.spare_parts (lower(btrim(part_number)));

CREATE POLICY "Staff can view spare parts" ON public.spare_parts
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Spare managers can add spare parts" ON public.spare_parts
  FOR INSERT TO authenticated WITH CHECK (public.is_management(auth.uid()) OR public.has_role(auth.uid(),'sparepart_manager'));
CREATE POLICY "Spare managers can edit spare parts" ON public.spare_parts
  FOR UPDATE TO authenticated USING (public.is_management(auth.uid()) OR public.has_role(auth.uid(),'sparepart_manager'))
  WITH CHECK (public.is_management(auth.uid()) OR public.has_role(auth.uid(),'sparepart_manager'));
CREATE POLICY "Management can delete spare parts" ON public.spare_parts
  FOR DELETE TO authenticated USING (public.is_management(auth.uid()));

CREATE TRIGGER spare_parts_touch BEFORE UPDATE ON public.spare_parts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.spare_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid NOT NULL REFERENCES public.spare_parts(id) ON DELETE CASCADE,
  movement_type text NOT NULL,
  qty numeric NOT NULL,
  rate numeric NOT NULL DEFAULT 0,
  reference text,
  remarks text,
  request_id uuid REFERENCES public.spare_requests(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.spare_stock_movements TO authenticated;
GRANT ALL ON public.spare_stock_movements TO service_role;
ALTER TABLE public.spare_stock_movements ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.spare_stock_movements
  ADD CONSTRAINT spare_movement_type_chk CHECK (movement_type IN ('IN','OUT','ADJUST','OPENING'));

CREATE INDEX spare_stock_movements_part_idx ON public.spare_stock_movements (part_id, created_at DESC);

CREATE POLICY "Staff can view spare stock movements" ON public.spare_stock_movements
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Spare managers can add spare stock movements" ON public.spare_stock_movements
  FOR INSERT TO authenticated WITH CHECK (public.is_management(auth.uid()) OR public.has_role(auth.uid(),'sparepart_manager'));

CREATE OR REPLACE FUNCTION public.record_spare_movement(
  _part_id uuid,
  _movement_type text,
  _qty numeric,
  _rate numeric DEFAULT 0,
  _reference text DEFAULT NULL,
  _remarks text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _current numeric;
BEGIN
  IF NOT (public.is_management(auth.uid()) OR public.has_role(auth.uid(),'sparepart_manager')) THEN
    RAISE EXCEPTION 'Not allowed to change spare parts stock';
  END IF;
  IF _movement_type NOT IN ('IN','OUT','ADJUST','OPENING') THEN
    RAISE EXCEPTION 'Invalid movement type';
  END IF;
  IF _qty IS NULL OR _qty <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;

  SELECT qty_on_hand INTO _current FROM public.spare_parts WHERE id = _part_id FOR UPDATE;
  IF _current IS NULL THEN
    RAISE EXCEPTION 'Spare part not found';
  END IF;

  IF _movement_type = 'OUT' THEN
    IF _current < _qty THEN
      RAISE EXCEPTION 'Only % in stock', _current;
    END IF;
    UPDATE public.spare_parts SET qty_on_hand = _current - _qty WHERE id = _part_id;
  ELSIF _movement_type IN ('IN','OPENING') THEN
    UPDATE public.spare_parts SET qty_on_hand = _current + _qty WHERE id = _part_id;
  ELSE
    UPDATE public.spare_parts SET qty_on_hand = _qty WHERE id = _part_id;
  END IF;

  INSERT INTO public.spare_stock_movements (part_id, movement_type, qty, rate, reference, remarks, created_by)
  VALUES (_part_id, _movement_type, _qty, COALESCE(_rate,0), _reference, _remarks, auth.uid())
  RETURNING id INTO _id;

  PERFORM public.log_activity('spare_part', _part_id, 'STOCK_' || _movement_type, NULL,
    jsonb_build_object('qty', _qty, 'rate', _rate));

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_spare_movement(uuid, text, numeric, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_spare_movement(uuid, text, numeric, numeric, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.upsert_spare_part_stock(
  _part_number text,
  _part_name text,
  _qty numeric,
  _category text DEFAULT NULL,
  _brand text DEFAULT NULL,
  _rack_location text DEFAULT NULL,
  _purchase_rate numeric DEFAULT 0,
  _sale_rate numeric DEFAULT 0,
  _min_qty numeric DEFAULT 0
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF NOT (public.is_management(auth.uid()) OR public.has_role(auth.uid(),'sparepart_manager')) THEN
    RAISE EXCEPTION 'Not allowed to upload spare parts stock';
  END IF;
  IF _part_number IS NULL OR btrim(_part_number) = '' THEN
    RAISE EXCEPTION 'Part number is required';
  END IF;
  IF _part_name IS NULL OR btrim(_part_name) = '' THEN
    RAISE EXCEPTION 'Part name is required';
  END IF;

  SELECT id INTO _id FROM public.spare_parts WHERE lower(btrim(part_number)) = lower(btrim(_part_number));

  IF _id IS NULL THEN
    INSERT INTO public.spare_parts (part_number, part_name, category, brand, rack_location, purchase_rate, sale_rate, qty_on_hand, min_qty, created_by)
    VALUES (btrim(_part_number), btrim(_part_name), _category, _brand, _rack_location,
            COALESCE(_purchase_rate,0), COALESCE(_sale_rate,0), COALESCE(_qty,0), COALESCE(_min_qty,0), auth.uid())
    RETURNING id INTO _id;
  ELSE
    UPDATE public.spare_parts SET
      part_name = btrim(_part_name),
      category = COALESCE(_category, category),
      brand = COALESCE(_brand, brand),
      rack_location = COALESCE(_rack_location, rack_location),
      purchase_rate = COALESCE(NULLIF(_purchase_rate,0), purchase_rate),
      sale_rate = COALESCE(NULLIF(_sale_rate,0), sale_rate),
      min_qty = COALESCE(_min_qty, min_qty),
      qty_on_hand = COALESCE(_qty, qty_on_hand),
      active = true
    WHERE id = _id;
  END IF;

  INSERT INTO public.spare_stock_movements (part_id, movement_type, qty, rate, reference, remarks, created_by)
  VALUES (_id, 'OPENING', COALESCE(_qty,0), COALESCE(_purchase_rate,0), 'BULK_UPLOAD', 'Current stock upload', auth.uid());

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_spare_part_stock(text, text, numeric, text, text, text, numeric, numeric, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_spare_part_stock(text, text, numeric, text, text, text, numeric, numeric, numeric) TO authenticated;
