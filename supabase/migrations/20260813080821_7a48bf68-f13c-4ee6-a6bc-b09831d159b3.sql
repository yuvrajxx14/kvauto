CREATE POLICY "cust docs read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'customer-documents');
CREATE POLICY "cust docs insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'customer-documents');
CREATE POLICY "cust docs update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'customer-documents');
CREATE POLICY "cust docs delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'customer-documents' AND public.is_management(auth.uid()));