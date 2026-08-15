DROP TABLE IF EXISTS public.chassis_print_references;

CREATE TABLE public.stock_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tractor_stock_id uuid NOT NULL REFERENCES public.tractor_stock(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('COMPANY_INVOICE','CHASSIS_PRINT')),
  file_path text NOT NULL,
  file_name text,
  document_number text,
  remarks text,
  uploaded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_documents_stock ON public.stock_documents(tractor_stock_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_documents TO authenticated;
GRANT ALL ON public.stock_documents TO service_role;

ALTER TABLE public.stock_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view vehicle documents" ON public.stock_documents
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can upload vehicle documents" ON public.stock_documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Management can update vehicle documents" ON public.stock_documents
  FOR UPDATE TO authenticated USING (public.is_management(auth.uid())) WITH CHECK (public.is_management(auth.uid()));
CREATE POLICY "Management can delete vehicle documents" ON public.stock_documents
  FOR DELETE TO authenticated USING (public.is_management(auth.uid()));

CREATE TRIGGER trg_stock_docs_touch BEFORE UPDATE ON public.stock_documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "Staff read vehicle docs storage" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'vehicle-documents');
CREATE POLICY "Staff upload vehicle docs storage" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vehicle-documents');
CREATE POLICY "Staff update vehicle docs storage" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'vehicle-documents');
CREATE POLICY "Management delete vehicle docs storage" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'vehicle-documents' AND public.is_management(auth.uid()));