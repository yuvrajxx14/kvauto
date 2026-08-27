REVOKE ALL ON FUNCTION public.is_accountant(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_accountant(uuid) TO authenticated;