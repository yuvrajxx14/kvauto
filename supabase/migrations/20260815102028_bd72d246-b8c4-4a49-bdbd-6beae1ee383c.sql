CREATE TABLE public.chassis_print_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tractor_stock_id uuid REFERENCES public.tractor_stock(id) ON DELETE SET NULL,
  chassis_number text NOT NULL,
  engine_number text,
  model text,
  variant text,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  delivery_id uuid REFERENCES public.deliveries(id) ON DELETE SET NULL,
  appearance_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  remarks text,
  generated_by uuid REFERENCES public.profiles(id),
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chassis_print_references TO authenticated;
GRANT ALL ON public.chassis_print_references TO service_role;

ALTER TABLE public.chassis_print_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view chassis references"
  ON public.chassis_print_references FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Staff can create chassis references"
  ON public.chassis_print_references FOR INSERT TO authenticated
  WITH CHECK (generated_by = auth.uid());

CREATE POLICY "Owner or management can update chassis references"
  ON public.chassis_print_references FOR UPDATE TO authenticated
  USING (generated_by = auth.uid() OR public.is_management(auth.uid()))
  WITH CHECK (generated_by = auth.uid() OR public.is_management(auth.uid()));

CREATE POLICY "Management can delete chassis references"
  ON public.chassis_print_references FOR DELETE TO authenticated
  USING (public.is_management(auth.uid()));

CREATE INDEX idx_chassis_refs_stock ON public.chassis_print_references(tractor_stock_id);
CREATE INDEX idx_chassis_refs_chassis ON public.chassis_print_references(chassis_number);

CREATE TRIGGER trg_chassis_refs_touch BEFORE UPDATE ON public.chassis_print_references
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();