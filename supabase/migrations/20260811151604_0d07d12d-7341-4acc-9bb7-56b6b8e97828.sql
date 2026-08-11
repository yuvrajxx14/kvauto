
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('ceo','manager','salesman','receptionist');
CREATE TYPE public.customer_type AS ENUM ('Farmer','Contractor','Commercial','Other');
CREATE TYPE public.inquiry_status AS ENUM ('NEW','CONTACTED','FOLLOW_UP','DEMO','NEGOTIATION','BOOKED','DELIVERED','LOST');
CREATE TYPE public.interest_level AS ENUM ('HOT','WARM','COLD');
CREATE TYPE public.contact_method AS ENUM ('Phone','WhatsApp','Visit','Showroom Visit','Demo','Other');
CREATE TYPE public.followup_status AS ENUM ('PENDING','COMPLETED','CANCELLED');
CREATE TYPE public.demo_status AS ENUM ('PLANNED','COMPLETED','CANCELLED');
CREATE TYPE public.booking_status AS ENUM ('BOOKED','ALLOCATED','READY_FOR_DELIVERY','DELIVERED','CANCELLED');
CREATE TYPE public.payment_mode AS ENUM ('Cash','Bank','UPI','Cheque');
CREATE TYPE public.tractor_stock_status AS ENUM ('AVAILABLE','RESERVED','SOLD');

-- ============ PROFILES / ROLES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_management(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('ceo','manager'));
$$;

CREATE OR REPLACE FUNCTION public.is_receptionist(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'receptionist');
$$;

CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles update own or mgmt" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_management(auth.uid()));

CREATE POLICY "roles readable by authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- first user bootstrap: allow a user to self-assign a role only if no roles exist yet
CREATE POLICY "bootstrap first role" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND NOT EXISTS (SELECT 1 FROM public.user_roles));
GRANT INSERT ON public.user_roles TO authenticated;

-- ============ ACTIVITY LOGS ============
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_entity ON public.activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_created ON public.activity_logs(created_at DESC);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs readable" ON public.activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "logs insert" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.log_activity(_entity_type TEXT, _entity_id UUID, _action TEXT, _old JSONB, _new JSONB)
RETURNS VOID LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.activity_logs(user_id, entity_type, entity_id, action, old_value, new_value)
  VALUES (auth.uid(), _entity_type, _entity_id, _action, _old, _new);
$$;

-- ============ CUSTOMERS ============
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  mobile TEXT NOT NULL UNIQUE,
  alternate_mobile TEXT,
  village TEXT NOT NULL DEFAULT '',
  taluka TEXT,
  district TEXT,
  address TEXT,
  customer_type public.customer_type NOT NULL DEFAULT 'Farmer',
  assigned_salesman_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
CREATE INDEX idx_customers_mobile ON public.customers(mobile);
CREATE INDEX idx_customers_village ON public.customers(village);
CREATE INDEX idx_customers_salesman ON public.customers(assigned_salesman_id);
GRANT SELECT, INSERT, UPDATE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers select" ON public.customers FOR SELECT TO authenticated
  USING (public.is_management(auth.uid()) OR public.is_receptionist(auth.uid())
         OR assigned_salesman_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY "customers insert" ON public.customers FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "customers update" ON public.customers FOR UPDATE TO authenticated
  USING (public.is_management(auth.uid()) OR assigned_salesman_id = auth.uid() OR created_by = auth.uid());

-- ============ INQUIRIES ============
CREATE SEQUENCE public.inquiry_seq START 1;
CREATE SEQUENCE public.booking_seq START 1;

CREATE TABLE public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  salesman_id UUID NOT NULL,
  inquiry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL DEFAULT 'Walk-in',
  model TEXT NOT NULL,
  hp TEXT,
  variant TEXT,
  expected_purchase_date DATE,
  purchase_purpose TEXT,
  budget NUMERIC(12,2),
  exchange_required BOOLEAN NOT NULL DEFAULT false,
  finance_required BOOLEAN NOT NULL DEFAULT false,
  subsidy_required BOOLEAN NOT NULL DEFAULT false,
  competitor TEXT,
  status public.inquiry_status NOT NULL DEFAULT 'NEW',
  interest_level public.interest_level NOT NULL DEFAULT 'WARM',
  next_followup_date DATE,
  remarks TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inq_customer ON public.inquiries(customer_id);
CREATE INDEX idx_inq_salesman ON public.inquiries(salesman_id);
CREATE INDEX idx_inq_status ON public.inquiries(status);
CREATE INDEX idx_inq_next_fu ON public.inquiries(next_followup_date);
CREATE INDEX idx_inq_model ON public.inquiries(model);
GRANT SELECT, INSERT, UPDATE ON public.inquiries TO authenticated;
GRANT ALL ON public.inquiries TO service_role;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_inquiry(_inquiry_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.inquiries i
    WHERE i.id = _inquiry_id AND (i.salesman_id = auth.uid() OR public.is_management(auth.uid()))
  );
$$;

CREATE POLICY "inquiries select" ON public.inquiries FOR SELECT TO authenticated
  USING (public.is_management(auth.uid()) OR salesman_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY "inquiries insert" ON public.inquiries FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (salesman_id = auth.uid() OR public.is_management(auth.uid()) OR public.is_receptionist(auth.uid())));
CREATE POLICY "inquiries update" ON public.inquiries FOR UPDATE TO authenticated
  USING (public.is_management(auth.uid()) OR salesman_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_inquiry_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.inquiry_number IS NULL OR NEW.inquiry_number = '' THEN
    NEW.inquiry_number := 'INQ-' || to_char(now(),'YYMM') || '-' || lpad(nextval('public.inquiry_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_inquiry_number BEFORE INSERT ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_inquiry_number();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_inq_touch BEFORE UPDATE ON public.inquiries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_cust_touch BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- audit inquiry status changes
CREATE OR REPLACE FUNCTION public.audit_inquiry()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs(user_id, entity_type, entity_id, action, new_value)
    VALUES (auth.uid(), 'inquiry', NEW.id, 'Inquiry created', jsonb_build_object('inquiry_number', NEW.inquiry_number, 'status', NEW.status));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.activity_logs(user_id, entity_type, entity_id, action, old_value, new_value)
    VALUES (auth.uid(), 'inquiry', NEW.id, 'Status changed', jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status));
  ELSE
    INSERT INTO public.activity_logs(user_id, entity_type, entity_id, action, old_value, new_value)
    VALUES (auth.uid(), 'inquiry', NEW.id, 'Inquiry edited', to_jsonb(OLD) - 'updated_at', to_jsonb(NEW) - 'updated_at');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_audit_inquiry AFTER INSERT OR UPDATE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.audit_inquiry();

-- ============ FOLLOWUPS ============
CREATE TABLE public.followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  salesman_id UUID NOT NULL,
  followup_date DATE NOT NULL DEFAULT CURRENT_DATE,
  followup_time TIME,
  contact_method public.contact_method NOT NULL DEFAULT 'Phone',
  discussion TEXT,
  customer_response TEXT,
  interest_level public.interest_level,
  competitor_info TEXT,
  expected_purchase_date DATE,
  next_action TEXT,
  next_followup_date DATE,
  status public.followup_status NOT NULL DEFAULT 'PENDING',
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fu_inquiry ON public.followups(inquiry_id);
CREATE INDEX idx_fu_salesman ON public.followups(salesman_id);
CREATE INDEX idx_fu_date ON public.followups(followup_date);
CREATE INDEX idx_fu_status ON public.followups(status);
GRANT SELECT, INSERT, UPDATE ON public.followups TO authenticated;
GRANT ALL ON public.followups TO service_role;
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fu select" ON public.followups FOR SELECT TO authenticated
  USING (public.is_management(auth.uid()) OR salesman_id = auth.uid());
CREATE POLICY "fu insert" ON public.followups FOR INSERT TO authenticated
  WITH CHECK (public.owns_inquiry(inquiry_id));
CREATE POLICY "fu update" ON public.followups FOR UPDATE TO authenticated
  USING (public.is_management(auth.uid()) OR salesman_id = auth.uid());

-- keep inquiry.next_followup_date in sync + log
CREATE OR REPLACE FUNCTION public.after_followup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.next_followup_date IS NOT NULL THEN
    UPDATE public.inquiries SET next_followup_date = NEW.next_followup_date WHERE id = NEW.inquiry_id;
  END IF;
  IF NEW.interest_level IS NOT NULL THEN
    UPDATE public.inquiries SET interest_level = NEW.interest_level WHERE id = NEW.inquiry_id;
  END IF;
  INSERT INTO public.activity_logs(user_id, entity_type, entity_id, action, new_value)
  VALUES (auth.uid(), 'inquiry', NEW.inquiry_id,
    CASE WHEN TG_OP='INSERT' THEN 'Follow-up created' ELSE 'Follow-up updated' END,
    jsonb_build_object('followup_date', NEW.followup_date, 'status', NEW.status, 'next_followup_date', NEW.next_followup_date));
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_after_followup AFTER INSERT OR UPDATE ON public.followups
  FOR EACH ROW EXECUTE FUNCTION public.after_followup();

-- ============ DEMOS ============
CREATE TABLE public.demos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  salesman_id UUID NOT NULL,
  tractor_model TEXT NOT NULL,
  demo_date DATE NOT NULL,
  location TEXT,
  status public.demo_status NOT NULL DEFAULT 'PLANNED',
  feedback TEXT,
  competitor_present TEXT,
  next_action TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_demo_inquiry ON public.demos(inquiry_id);
GRANT SELECT, INSERT, UPDATE ON public.demos TO authenticated;
GRANT ALL ON public.demos TO service_role;
ALTER TABLE public.demos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo select" ON public.demos FOR SELECT TO authenticated
  USING (public.is_management(auth.uid()) OR salesman_id = auth.uid());
CREATE POLICY "demo insert" ON public.demos FOR INSERT TO authenticated WITH CHECK (public.owns_inquiry(inquiry_id));
CREATE POLICY "demo update" ON public.demos FOR UPDATE TO authenticated
  USING (public.is_management(auth.uid()) OR salesman_id = auth.uid());

-- ============ NEGOTIATIONS ============
CREATE TABLE public.negotiations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
  tractor_model TEXT,
  quoted_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  accessories TEXT,
  exchange_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  finance NUMERIC(12,2) NOT NULL DEFAULT 0,
  subsidy NUMERIC(12,2) NOT NULL DEFAULT 0,
  final_expected_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  customer_demand NUMERIC(12,2),
  competitor_quote TEXT,
  remarks TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_nego_inquiry ON public.negotiations(inquiry_id);
GRANT SELECT, INSERT ON public.negotiations TO authenticated;
GRANT ALL ON public.negotiations TO service_role;
ALTER TABLE public.negotiations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nego select" ON public.negotiations FOR SELECT TO authenticated USING (public.owns_inquiry(inquiry_id));
CREATE POLICY "nego insert" ON public.negotiations FOR INSERT TO authenticated
  WITH CHECK (public.owns_inquiry(inquiry_id) AND created_by = auth.uid());

CREATE OR REPLACE FUNCTION public.audit_negotiation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prev NUMERIC;
BEGIN
  SELECT final_expected_price INTO prev FROM public.negotiations
   WHERE inquiry_id = NEW.inquiry_id AND id <> NEW.id ORDER BY created_at DESC LIMIT 1;
  INSERT INTO public.activity_logs(user_id, entity_type, entity_id, action, old_value, new_value)
  VALUES (auth.uid(), 'inquiry', NEW.inquiry_id, 'Price changed',
    jsonb_build_object('final_expected_price', prev),
    jsonb_build_object('final_expected_price', NEW.final_expected_price, 'quoted_price', NEW.quoted_price));
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_audit_nego AFTER INSERT ON public.negotiations
  FOR EACH ROW EXECUTE FUNCTION public.audit_negotiation();

-- ============ TRACTOR STOCK (minimal, future module) ============
CREATE TABLE public.tractor_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chassis_number TEXT NOT NULL UNIQUE,
  engine_number TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  variant TEXT,
  hp TEXT,
  status public.tractor_stock_status NOT NULL DEFAULT 'AVAILABLE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_status ON public.tractor_stock(status);
GRANT SELECT, INSERT, UPDATE ON public.tractor_stock TO authenticated;
GRANT ALL ON public.tractor_stock TO service_role;
ALTER TABLE public.tractor_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock select" ON public.tractor_stock FOR SELECT TO authenticated USING (true);
CREATE POLICY "stock insert mgmt" ON public.tractor_stock FOR INSERT TO authenticated WITH CHECK (public.is_management(auth.uid()));
CREATE POLICY "stock update" ON public.tractor_stock FOR UPDATE TO authenticated USING (true);

-- ============ BOOKINGS ============
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number TEXT NOT NULL UNIQUE,
  inquiry_id UUID NOT NULL UNIQUE REFERENCES public.inquiries(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  salesman_id UUID NOT NULL,
  booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  tractor_model TEXT NOT NULL,
  variant TEXT,
  final_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  booking_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_received NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_mode public.payment_mode,
  expected_delivery_date DATE,
  finance_required BOOLEAN NOT NULL DEFAULT false,
  finance_company TEXT,
  exchange_required BOOLEAN NOT NULL DEFAULT false,
  exchange_details TEXT,
  subsidy_required BOOLEAN NOT NULL DEFAULT false,
  status public.booking_status NOT NULL DEFAULT 'BOOKED',
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bk_customer ON public.bookings(customer_id);
CREATE INDEX idx_bk_salesman ON public.bookings(salesman_id);
CREATE INDEX idx_bk_status ON public.bookings(status);
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bk select" ON public.bookings FOR SELECT TO authenticated
  USING (public.is_management(auth.uid()) OR salesman_id = auth.uid());
CREATE POLICY "bk insert" ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (public.is_management(auth.uid()) OR salesman_id = auth.uid());
CREATE POLICY "bk update" ON public.bookings FOR UPDATE TO authenticated
  USING (public.is_management(auth.uid()) OR salesman_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_booking_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.booking_number IS NULL OR NEW.booking_number = '' THEN
    NEW.booking_number := 'BK-' || to_char(now(),'YYMM') || '-' || lpad(nextval('public.booking_seq')::text, 4, '0');
  END IF;
  NEW.balance := COALESCE(NEW.booking_amount,0) - COALESCE(NEW.amount_received,0);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_booking_number BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_booking_number();
CREATE TRIGGER trg_bk_touch BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.after_booking_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.inquiries SET status = 'BOOKED' WHERE id = NEW.inquiry_id;
  INSERT INTO public.activity_logs(user_id, entity_type, entity_id, action, new_value)
  VALUES (auth.uid(), 'booking', NEW.id, 'Booking created', jsonb_build_object('booking_number', NEW.booking_number, 'final_price', NEW.final_price));
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_after_booking AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.after_booking_insert();

-- ============ BOOKING PAYMENTS ============
CREATE TABLE public.booking_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_mode public.payment_mode NOT NULL DEFAULT 'Cash',
  reference_number TEXT,
  remarks TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pay_booking ON public.booking_payments(booking_id);
GRANT SELECT, INSERT ON public.booking_payments TO authenticated;
GRANT ALL ON public.booking_payments TO service_role;
ALTER TABLE public.booking_payments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_booking(_booking_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = _booking_id
    AND (b.salesman_id = auth.uid() OR public.is_management(auth.uid())));
$$;
CREATE POLICY "pay select" ON public.booking_payments FOR SELECT TO authenticated USING (public.owns_booking(booking_id));
CREATE POLICY "pay insert" ON public.booking_payments FOR INSERT TO authenticated
  WITH CHECK (public.owns_booking(booking_id) AND created_by = auth.uid());

CREATE OR REPLACE FUNCTION public.after_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount),0) INTO total FROM public.booking_payments WHERE booking_id = NEW.booking_id;
  UPDATE public.bookings SET amount_received = total, balance = booking_amount - total WHERE id = NEW.booking_id;
  INSERT INTO public.activity_logs(user_id, entity_type, entity_id, action, new_value)
  VALUES (auth.uid(), 'booking', NEW.booking_id, 'Payment added', jsonb_build_object('amount', NEW.amount, 'mode', NEW.payment_mode));
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_after_payment AFTER INSERT ON public.booking_payments
  FOR EACH ROW EXECUTE FUNCTION public.after_payment();

-- ============ TRACTOR ALLOCATIONS ============
CREATE TABLE public.tractor_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  tractor_stock_id UUID NOT NULL UNIQUE REFERENCES public.tractor_stock(id) ON DELETE RESTRICT,
  chassis_number TEXT NOT NULL,
  engine_number TEXT NOT NULL,
  model TEXT,
  variant TEXT,
  allocated_date DATE NOT NULL DEFAULT CURRENT_DATE,
  allocated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.tractor_allocations TO authenticated;
GRANT ALL ON public.tractor_allocations TO service_role;
ALTER TABLE public.tractor_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alloc select" ON public.tractor_allocations FOR SELECT TO authenticated USING (public.owns_booking(booking_id));
CREATE POLICY "alloc insert" ON public.tractor_allocations FOR INSERT TO authenticated
  WITH CHECK (public.owns_booking(booking_id) AND allocated_by = auth.uid());

CREATE OR REPLACE FUNCTION public.before_allocation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st public.tractor_stock_status;
BEGIN
  SELECT status INTO st FROM public.tractor_stock WHERE id = NEW.tractor_stock_id FOR UPDATE;
  IF st IS DISTINCT FROM 'AVAILABLE' THEN
    RAISE EXCEPTION 'Tractor is not available for allocation';
  END IF;
  UPDATE public.tractor_stock SET status = 'RESERVED' WHERE id = NEW.tractor_stock_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_before_alloc BEFORE INSERT ON public.tractor_allocations
  FOR EACH ROW EXECUTE FUNCTION public.before_allocation();

CREATE OR REPLACE FUNCTION public.after_allocation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.bookings SET status = 'ALLOCATED' WHERE id = NEW.booking_id AND status = 'BOOKED';
  INSERT INTO public.activity_logs(user_id, entity_type, entity_id, action, new_value)
  VALUES (auth.uid(), 'booking', NEW.booking_id, 'Tractor allocated',
    jsonb_build_object('chassis_number', NEW.chassis_number, 'engine_number', NEW.engine_number));
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_after_alloc AFTER INSERT ON public.tractor_allocations
  FOR EACH ROW EXECUTE FUNCTION public.after_allocation();

-- ============ LOST INQUIRIES ============
CREATE TABLE public.lost_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL UNIQUE REFERENCES public.inquiries(id) ON DELETE RESTRICT,
  lost_reason TEXT NOT NULL,
  competitor TEXT,
  lost_date DATE NOT NULL DEFAULT CURRENT_DATE,
  remarks TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.lost_inquiries TO authenticated;
GRANT ALL ON public.lost_inquiries TO service_role;
ALTER TABLE public.lost_inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lost select" ON public.lost_inquiries FOR SELECT TO authenticated USING (public.owns_inquiry(inquiry_id));
CREATE POLICY "lost insert" ON public.lost_inquiries FOR INSERT TO authenticated
  WITH CHECK (public.owns_inquiry(inquiry_id) AND created_by = auth.uid());

CREATE OR REPLACE FUNCTION public.after_lost()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.inquiries SET status = 'LOST', next_followup_date = NULL WHERE id = NEW.inquiry_id;
  INSERT INTO public.activity_logs(user_id, entity_type, entity_id, action, new_value)
  VALUES (auth.uid(), 'inquiry', NEW.inquiry_id, 'Inquiry marked lost', jsonb_build_object('reason', NEW.lost_reason));
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_after_lost AFTER INSERT ON public.lost_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.after_lost();
