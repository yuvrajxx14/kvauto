-- Booking + customer ledger foundation.
-- Extends the existing Sales schema without rebuilding Inquiry.

ALTER TYPE public.payment_mode ADD VALUE IF NOT EXISTS 'Other';

CREATE TYPE public.customer_ledger_entry_type AS ENUM (
  'OPENING_BALANCE',
  'BOOKING',
  'OTHER_RECEIVABLE',
  'PAYMENT'
);

CREATE TABLE IF NOT EXISTS public.customer_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE REFERENCES public.customers(id) ON DELETE RESTRICT,
  opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  entry_type public.customer_ledger_entry_type NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE RESTRICT,
  payment_id UUID REFERENCES public.booking_payments(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL DEFAULT '',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_accounts_customer
  ON public.customer_accounts(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer_date
  ON public.customer_ledger_entries(customer_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_customer_ledger_booking
  ON public.customer_ledger_entries(booking_id);

GRANT SELECT, INSERT, UPDATE ON public.customer_accounts TO authenticated;
GRANT SELECT, INSERT ON public.customer_ledger_entries TO authenticated;
GRANT ALL ON public.customer_accounts, public.customer_ledger_entries TO service_role;

ALTER TABLE public.customer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_customer(_customer_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = _customer_id
      AND (
        public.is_management(auth.uid())
        OR c.assigned_salesman_id = auth.uid()
        OR c.created_by = auth.uid()
      )
  );
$$;

CREATE POLICY "customer accounts select"
ON public.customer_accounts FOR SELECT TO authenticated
USING (public.owns_customer(customer_id));

CREATE POLICY "customer accounts insert"
ON public.customer_accounts FOR INSERT TO authenticated
WITH CHECK (public.owns_customer(customer_id));

CREATE POLICY "customer accounts update"
ON public.customer_accounts FOR UPDATE TO authenticated
USING (public.owns_customer(customer_id));

CREATE POLICY "customer ledger select"
ON public.customer_ledger_entries FOR SELECT TO authenticated
USING (public.owns_customer(customer_id));

CREATE POLICY "customer ledger insert"
ON public.customer_ledger_entries FOR INSERT TO authenticated
WITH CHECK (public.owns_customer(customer_id));

CREATE OR REPLACE FUNCTION public.ensure_customer_account(_customer_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE account_id UUID;
BEGIN
  INSERT INTO public.customer_accounts(customer_id)
  VALUES (_customer_id)
  ON CONFLICT (customer_id) DO NOTHING;

  SELECT id INTO account_id
  FROM public.customer_accounts
  WHERE customer_id = _customer_id;

  RETURN account_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  _inquiry_id UUID,
  _final_price NUMERIC,
  _booking_amount NUMERIC,
  _booking_date DATE,
  _salesman_id UUID,
  _remarks TEXT,
  _tractor_model TEXT,
  _variant TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  i public.inquiries%ROWTYPE;
  existing_booking UUID;
  booking_id UUID;
  account_id UUID;
BEGIN
  IF _final_price < 0 OR _booking_amount < 0 THEN
    RAISE EXCEPTION 'Amounts cannot be negative';
  END IF;

  SELECT * INTO i
  FROM public.inquiries
  WHERE id = _inquiry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inquiry not found';
  END IF;

  IF NOT (
    public.is_management(auth.uid())
    OR i.salesman_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You do not have access to this inquiry';
  END IF;

  SELECT id INTO existing_booking
  FROM public.bookings
  WHERE inquiry_id = _inquiry_id;

  IF existing_booking IS NOT NULL THEN
    RAISE EXCEPTION 'This inquiry already has a booking';
  END IF;

  account_id := public.ensure_customer_account(i.customer_id);

  INSERT INTO public.bookings (
    booking_number,
    inquiry_id,
    customer_id,
    salesman_id,
    booking_date,
    tractor_model,
    variant,
    final_price,
    booking_amount,
    amount_received,
    balance,
    status,
    remarks
  )
  VALUES (
    '',
    i.id,
    i.customer_id,
    _salesman_id,
    COALESCE(_booking_date, CURRENT_DATE),
    COALESCE(NULLIF(_tractor_model, ''), i.model),
    NULLIF(_variant, ''),
    _final_price,
    _booking_amount,
    0,
    _booking_amount,
    'BOOKED',
    NULLIF(_remarks, '')
  )
  RETURNING id INTO booking_id;

  INSERT INTO public.customer_ledger_entries (
    account_id, customer_id, entry_type, booking_id, amount,
    entry_date, description, created_by
  )
  VALUES (
    account_id, i.customer_id, 'BOOKING', booking_id, _booking_amount,
    COALESCE(_booking_date, CURRENT_DATE),
    'Booking receivable',
    auth.uid()
  );

  UPDATE public.inquiries
  SET status = 'BOOKED'
  WHERE id = i.id;

  RETURN booking_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.receive_booking_payment_atomic(
  _booking_id UUID,
  _amount NUMERIC,
  _payment_date DATE,
  _payment_mode public.payment_mode,
  _reference_number TEXT,
  _remarks TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  b public.bookings%ROWTYPE;
  account_id UUID;
  payment_id UUID;
  outstanding NUMERIC;
BEGIN
  IF _amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  SELECT * INTO b
  FROM public.bookings
  WHERE id = _booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF NOT (
    public.is_management(auth.uid())
    OR b.salesman_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You do not have access to this booking';
  END IF;

  outstanding := GREATEST(0, b.final_price - COALESCE(b.amount_received, 0));

  IF _amount > outstanding THEN
    RAISE EXCEPTION 'Payment exceeds outstanding booking balance';
  END IF;

  account_id := public.ensure_customer_account(b.customer_id);

  INSERT INTO public.booking_payments (
    booking_id, amount, payment_date, payment_mode,
    reference_number, remarks, created_by
  )
  VALUES (
    b.id, _amount, COALESCE(_payment_date, CURRENT_DATE),
    _payment_mode, NULLIF(_reference_number, ''), NULLIF(_remarks, ''),
    auth.uid()
  )
  RETURNING id INTO payment_id;

  INSERT INTO public.customer_ledger_entries (
    account_id, customer_id, entry_type, booking_id, payment_id,
    amount, entry_date, description, created_by
  )
  VALUES (
    account_id, b.customer_id, 'PAYMENT', b.id, payment_id,
    _amount, COALESCE(_payment_date, CURRENT_DATE),
    'Booking payment received',
    auth.uid()
  );

  RETURN payment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.owns_customer(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_customer_account(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_booking_atomic(UUID, NUMERIC, NUMERIC, DATE, UUID, TEXT, TEXT, TEXT)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.receive_booking_payment_atomic(UUID, NUMERIC, DATE, public.payment_mode, TEXT, TEXT)
  TO authenticated, service_role;
