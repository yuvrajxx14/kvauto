ALTER TABLE public.passing_records
  ADD COLUMN IF NOT EXISTS number_plate_number text,
  ADD COLUMN IF NOT EXISTS passing_date date;

ALTER TABLE public.tractor_stock
  ADD COLUMN IF NOT EXISTS received_from text;