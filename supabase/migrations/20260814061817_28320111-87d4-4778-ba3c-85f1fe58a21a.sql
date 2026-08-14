CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model text NOT NULL UNIQUE,
  hp text,
  category text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view products" ON public.products
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Management can insert products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.is_management(auth.uid()));
CREATE POLICY "Management can update products" ON public.products
  FOR UPDATE TO authenticated USING (public.is_management(auth.uid())) WITH CHECK (public.is_management(auth.uid()));
CREATE POLICY "Management can delete products" ON public.products
  FOR DELETE TO authenticated USING (public.is_management(auth.uid()));

CREATE TRIGGER trg_products_touch BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.products (model, sort_order) VALUES
  ('415 YUVO', 1),
  ('475 YUVO RCX', 2),
  ('475 NBP', 3),
  ('405 YUVO', 4),
  ('215 YUVRAJ 28 OIB', 5),
  ('575 YUVO RCX', 6),
  ('585 YUVO RCX', 7),
  ('275 NBP LT', 8),
  ('225 JIVO 4WD', 9),
  ('225 JIVO 2WD', 10),
  ('275 XP PLUS', 11),
  ('215 YUVRAJ 28 SADU', 12),
  ('475 YUVO V1', 13),
  ('2124 OJA', 14),
  ('215 YUVRAJ 32 OIB', 15),
  ('275 TU PP', 16),
  ('215 YUVRAJ 40 OIB', 17),
  ('275 NBP', 18),
  ('585 YUVO SLPTO', 19),
  ('575 NBP', 20),
  ('475 YUVO SC', 21),
  ('2130 OJA', 22),
  ('305 JIVO 4WD', 23);