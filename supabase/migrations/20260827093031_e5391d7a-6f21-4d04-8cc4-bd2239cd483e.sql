CREATE OR REPLACE FUNCTION public.staff_directory_roles()
RETURNS TABLE(id uuid, full_name text, roles text[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name,
         COALESCE((SELECT array_agg(ur.role::text) FROM public.user_roles ur WHERE ur.user_id = p.id), '{}')
  FROM public.profiles p
  WHERE public.is_staff(auth.uid())
  ORDER BY p.full_name
$$;

REVOKE ALL ON FUNCTION public.staff_directory_roles() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.staff_directory_roles() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_accountant(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'accountant');
$$;

CREATE POLICY "Management can delete inquiries" ON public.inquiries FOR DELETE TO authenticated USING (public.is_management(auth.uid()));
CREATE POLICY "Management can delete customers" ON public.customers FOR DELETE TO authenticated USING (public.is_management(auth.uid()));
CREATE POLICY "Management can delete bookings" ON public.bookings FOR DELETE TO authenticated USING (public.is_management(auth.uid()));
CREATE POLICY "Management can delete stock" ON public.tractor_stock FOR DELETE TO authenticated USING (public.is_management(auth.uid()));
CREATE POLICY "Management can delete followups" ON public.followups FOR DELETE TO authenticated USING (public.is_management(auth.uid()));
CREATE POLICY "Management can delete demos" ON public.demos FOR DELETE TO authenticated USING (public.is_management(auth.uid()));

CREATE POLICY "Accountant can update deliveries" ON public.deliveries FOR UPDATE TO authenticated USING (public.is_accountant(auth.uid()) OR public.is_management(auth.uid())) WITH CHECK (public.is_accountant(auth.uid()) OR public.is_management(auth.uid()));
CREATE POLICY "Accountant can update passing" ON public.passing_records FOR UPDATE TO authenticated USING (public.is_accountant(auth.uid()) OR public.is_management(auth.uid())) WITH CHECK (public.is_accountant(auth.uid()) OR public.is_management(auth.uid()));
CREATE POLICY "Accountant can update subsidy" ON public.subsidy_cases FOR UPDATE TO authenticated USING (public.is_accountant(auth.uid()) OR public.is_management(auth.uid())) WITH CHECK (public.is_accountant(auth.uid()) OR public.is_management(auth.uid()));
CREATE POLICY "Accountant can add stock" ON public.tractor_stock FOR INSERT TO authenticated WITH CHECK (public.is_accountant(auth.uid()) OR public.is_management(auth.uid()));
CREATE POLICY "Accountant can update stock" ON public.tractor_stock FOR UPDATE TO authenticated USING (public.is_accountant(auth.uid()) OR public.is_management(auth.uid())) WITH CHECK (public.is_accountant(auth.uid()) OR public.is_management(auth.uid()));