
GRANT DELETE ON public.user_roles TO authenticated;
CREATE POLICY "mgmt manage roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_management(auth.uid()));
CREATE POLICY "mgmt delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.is_management(auth.uid()) AND user_id <> auth.uid());
