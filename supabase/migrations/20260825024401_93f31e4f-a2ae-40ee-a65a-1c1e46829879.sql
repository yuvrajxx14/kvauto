-- staff helper
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id) $$;

-- management-only staff directory with contact details
CREATE OR REPLACE FUNCTION public.staff_directory()
RETURNS TABLE (id uuid, full_name text, email text, phone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.full_name,
         CASE WHEN public.is_management(auth.uid()) OR p.id = auth.uid() THEN p.email END,
         CASE WHEN public.is_management(auth.uid()) OR p.id = auth.uid() THEN p.phone END
  FROM public.profiles p
  WHERE public.is_staff(auth.uid())
  ORDER BY p.full_name
$$;

-- 1. activity logs: management only
DROP POLICY IF EXISTS "logs readable" ON public.activity_logs;
CREATE POLICY "logs readable by management" ON public.activity_logs
  FOR SELECT TO authenticated USING (public.is_management(auth.uid()));

-- 2. profiles: no PII to all staff
DROP POLICY IF EXISTS "profiles readable by authenticated" ON public.profiles;
CREATE POLICY "profiles readable by staff" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, full_name, created_at) ON public.profiles TO authenticated;
GRANT INSERT (id, full_name, email, phone) ON public.profiles TO authenticated;
GRANT UPDATE (full_name, email, phone) ON public.profiles TO authenticated;

-- 3. stock_documents insert: staff with a role only
DROP POLICY IF EXISTS "Staff can upload vehicle documents" ON public.stock_documents;
CREATE POLICY "Staff can upload vehicle documents" ON public.stock_documents
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Staff can view vehicle documents" ON public.stock_documents;
CREATE POLICY "Staff can view vehicle documents" ON public.stock_documents
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- 4. tax invoices: ownership scoped
DROP POLICY IF EXISTS "Staff can create tax invoices" ON public.tax_invoices;
CREATE POLICY "Staff can create tax invoices" ON public.tax_invoices
  FOR INSERT TO authenticated WITH CHECK (public.owns_booking(booking_id));
DROP POLICY IF EXISTS "Staff can view tax invoices" ON public.tax_invoices;
CREATE POLICY "Staff can view tax invoices" ON public.tax_invoices
  FOR SELECT TO authenticated USING (public.owns_booking(booking_id));

-- 5. tractor stock updates: staff roles only
DROP POLICY IF EXISTS "stock update" ON public.tractor_stock;
CREATE POLICY "stock update by staff" ON public.tractor_stock
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- 6. customer-documents storage scoped to the customer the user may access
DROP POLICY IF EXISTS "cust docs read" ON storage.objects;
DROP POLICY IF EXISTS "cust docs insert" ON storage.objects;
DROP POLICY IF EXISTS "cust docs update" ON storage.objects;
CREATE POLICY "cust docs read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'customer-documents'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND public.owns_customer(((storage.foldername(name))[1])::uuid));
CREATE POLICY "cust docs insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'customer-documents'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND public.owns_customer(((storage.foldername(name))[1])::uuid));
CREATE POLICY "cust docs update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'customer-documents'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND public.owns_customer(((storage.foldername(name))[1])::uuid))
  WITH CHECK (bucket_id = 'customer-documents'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND public.owns_customer(((storage.foldername(name))[1])::uuid));

-- 7. vehicle-documents storage: staff roles + path must match a real stock unit
DROP POLICY IF EXISTS "Staff read vehicle docs storage" ON storage.objects;
DROP POLICY IF EXISTS "Staff update vehicle docs storage" ON storage.objects;
DROP POLICY IF EXISTS "Staff upload vehicle docs storage" ON storage.objects;
CREATE POLICY "Staff read vehicle docs storage" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'vehicle-documents' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff upload vehicle docs storage" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vehicle-documents' AND public.is_staff(auth.uid())
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND EXISTS (SELECT 1 FROM public.tractor_stock t WHERE t.id = ((storage.foldername(name))[1])::uuid));
CREATE POLICY "Staff update vehicle docs storage" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'vehicle-documents' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'vehicle-documents' AND public.is_staff(auth.uid()));

-- 8. lock down SECURITY DEFINER functions
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION
  public.has_role(uuid, app_role),
  public.is_management(uuid),
  public.is_receptionist(uuid),
  public.is_staff(uuid),
  public.owns_booking(uuid),
  public.owns_customer(uuid),
  public.owns_inquiry(uuid),
  public.staff_directory(),
  public.allocate_tractor_atomic(uuid, uuid),
  public.cancel_booking_atomic(uuid, text, numeric, text, text),
  public.complete_delivery_atomic(uuid, date, text, text, text, text, date, date),
  public.create_booking_atomic(uuid, numeric, numeric, date, uuid, text, text, text, text, text, numeric),
  public.issue_tax_invoice(uuid, date, numeric, numeric, text, text, text, text, text, text, text),
  public.post_extra_charge_atomic(uuid, numeric, text, text),
  public.receive_booking_payment_atomic(uuid, numeric, date, text, text, text, text)
TO authenticated;