ALTER TABLE public.tractor_stock
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS advance_delivered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS adv_customer_name text,
  ADD COLUMN IF NOT EXISTS adv_mobile text,
  ADD COLUMN IF NOT EXISTS adv_village text,
  ADD COLUMN IF NOT EXISTS adv_date date;