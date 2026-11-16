DROP POLICY IF EXISTS "cfg select" ON public.model_stock_config;
CREATE POLICY "cfg select" ON public.model_stock_config FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "orders select" ON public.tractor_orders;
CREATE POLICY "orders select" ON public.tractor_orders FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "checklist select" ON public.document_checklist;
CREATE POLICY "checklist select" ON public.document_checklist FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can view products" ON public.products;
CREATE POLICY "Staff can view products" ON public.products FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "roles readable by authenticated" ON public.user_roles;
CREATE POLICY "roles readable by authenticated" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_management(auth.uid()));

DROP POLICY IF EXISTS "stock select" ON public.tractor_stock;
CREATE POLICY "stock select" ON public.tractor_stock FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));