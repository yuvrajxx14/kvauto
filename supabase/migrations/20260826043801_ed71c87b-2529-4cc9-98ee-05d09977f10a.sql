ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'accountant';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'service_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sparepart_manager';

CREATE OR REPLACE FUNCTION public.is_management(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text IN ('ceo','manager','sales_manager'));
$function$;

CREATE OR REPLACE FUNCTION public.is_workshop(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('workshop_manager','mechanic','service_manager','sparepart_manager','ceo','manager','sales_manager')
  );
$function$;