ALTER TABLE public.passing_records
  ADD COLUMN IF NOT EXISTS passing_set_printed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS passing_set_printed_date date,
  ADD COLUMN IF NOT EXISTS sent_to_rto boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sent_to_rto_date date,
  ADD COLUMN IF NOT EXISTS number_plate_ordered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS number_plate_ordered_date date,
  ADD COLUMN IF NOT EXISTS number_plate_received boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS number_plate_received_date date,
  ADD COLUMN IF NOT EXISTS fitment_date date,
  ADD COLUMN IF NOT EXISTS subsidy_file_printed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subsidy_file_printed_date date,
  ADD COLUMN IF NOT EXISTS subsidy_file_status text NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS subsidy_file_uploaded_date date;

INSERT INTO public.document_checklist (category, doc_type, label, is_required, has_number, has_expiry, sort_order, active)
SELECT 'IDENTITY', 'VOTER_ID', 'Voter ID', false, true, false, 3, true
WHERE NOT EXISTS (SELECT 1 FROM public.document_checklist WHERE doc_type = 'VOTER_ID');