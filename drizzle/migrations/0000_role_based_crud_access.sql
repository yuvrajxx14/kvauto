-- Management-only edit/delete rules for records that previously could never be edited or removed

CREATE POLICY "Management can delete passing records"
  ON public.passing_records FOR DELETE TO authenticated
  USING (is_management(auth.uid()));

CREATE POLICY "Management can delete subsidy cases"
  ON public.subsidy_cases FOR DELETE TO authenticated
  USING (is_management(auth.uid()));

CREATE POLICY "Management can delete villages"
  ON public.villages FOR DELETE TO authenticated
  USING (is_management(auth.uid()));

CREATE POLICY "Management can update account invoices"
  ON public.account_invoices FOR UPDATE TO authenticated
  USING (is_management(auth.uid())) WITH CHECK (is_management(auth.uid()));

CREATE POLICY "Management can delete account invoices"
  ON public.account_invoices FOR DELETE TO authenticated
  USING (is_management(auth.uid()));

CREATE POLICY "Management can update account invoice items"
  ON public.account_invoice_items FOR UPDATE TO authenticated
  USING (is_management(auth.uid())) WITH CHECK (is_management(auth.uid()));

CREATE POLICY "Management can delete account invoice items"
  ON public.account_invoice_items FOR DELETE TO authenticated
  USING (is_management(auth.uid()));

CREATE POLICY "Management can update booking payments"
  ON public.booking_payments FOR UPDATE TO authenticated
  USING (is_management(auth.uid())) WITH CHECK (is_management(auth.uid()));

CREATE POLICY "Management can delete booking payments"
  ON public.booking_payments FOR DELETE TO authenticated
  USING (is_management(auth.uid()));

GRANT UPDATE, DELETE ON public.passing_records, public.subsidy_cases, public.villages,
  public.account_invoices, public.account_invoice_items, public.booking_payments TO authenticated;
GRANT ALL ON public.passing_records, public.subsidy_cases, public.villages,
  public.account_invoices, public.account_invoice_items, public.booking_payments TO service_role;

-- Keep the booking balance correct when a payment is edited or deleted
CREATE OR REPLACE FUNCTION public.booking_payment_adjust()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.bookings
       SET amount_received = COALESCE(amount_received, 0) - OLD.amount
     WHERE id = OLD.booking_id;
    RETURN OLD;
  ELSE
    UPDATE public.bookings
       SET amount_received = COALESCE(amount_received, 0) + (NEW.amount - OLD.amount)
     WHERE id = NEW.booking_id;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS booking_payment_adjust_trg ON public.booking_payments;
CREATE TRIGGER booking_payment_adjust_trg
  AFTER UPDATE OR DELETE ON public.booking_payments
  FOR EACH ROW EXECUTE FUNCTION public.booking_payment_adjust();

-- Put accessory / spare stock back when an account invoice is deleted
CREATE OR REPLACE FUNCTION public.account_invoice_reverse_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  it RECORD;
BEGIN
  FOR it IN SELECT * FROM public.account_invoice_items WHERE invoice_id = OLD.id LOOP
    IF it.accessory_id IS NOT NULL THEN
      UPDATE public.accessories
         SET qty_on_hand = qty_on_hand + CASE WHEN OLD.invoice_type = 'PURCHASE' THEN -it.qty ELSE it.qty END
       WHERE id = it.accessory_id;
    ELSIF it.spare_part_id IS NOT NULL THEN
      UPDATE public.spare_parts
         SET qty_on_hand = qty_on_hand + CASE WHEN OLD.invoice_type = 'PURCHASE' THEN -it.qty ELSE it.qty END
       WHERE id = it.spare_part_id;
    END IF;
  END LOOP;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS account_invoice_reverse_stock_trg ON public.account_invoices;
CREATE TRIGGER account_invoice_reverse_stock_trg
  BEFORE DELETE ON public.account_invoices
  FOR EACH ROW EXECUTE FUNCTION public.account_invoice_reverse_stock();
