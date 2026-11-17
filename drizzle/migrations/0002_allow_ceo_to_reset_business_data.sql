CREATE OR REPLACE FUNCTION public.clear_dealership_data_for_ceo()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t text;
  table_names text[] := ARRAY[
    'accessory_movements','account_invoice_items','account_invoices','activity_logs','attendance_records',
    'booking_cancellations','booking_payments','bookings','customer_documents','customers','deliveries',
    'delivery_accessories','demos','document_checklist','employee_onboarding','employees','followups',
    'gate_passes','implement_payments','implement_sale_items','implement_sales','implement_stock',
    'inquiries','ledger_entries','lost_inquiries','model_stock_config','monthly_plans','negotiations',
    'onboarding_checklist','passing_checklist','passing_records','payroll_runs','payslips','plan_days',
    'plan_tasks','products','service_checklist','service_jobs','service_route_stops','service_routes',
    'sop_acknowledgements','sop_questions','sops','spare_parts','spare_request_items','spare_requests',
    'spare_stock_movements','stock_documents','subsidy_cases','tax_invoices','tractor_allocations',
    'tractor_orders','tractor_stock','villages'
  ];
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'ceo'::public.app_role) THEN
    RAISE EXCEPTION 'Only the signed-in CEO can clear dealership data';
  END IF;

  FOREACH t IN ARRAY table_names LOOP
    EXECUTE format('DELETE FROM public.%I', t);
  END LOOP;

  DELETE FROM public.user_roles WHERE user_id <> auth.uid();
  DELETE FROM public.profiles WHERE id <> auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION public.clear_dealership_data_for_ceo() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_dealership_data_for_ceo() TO authenticated;
