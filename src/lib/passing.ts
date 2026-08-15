/** Subsidy file checklist — dealer-side items are prepared by us, customer-side items come from the customer. */
export const SUBSIDY_CHECKLIST = [
  { key: "dealer_invoice", label: "Dealer invoice", provided_by: "DEALER" },
  { key: "money_receipt", label: "Money receipt", provided_by: "DEALER" },
  { key: "aadhaar", label: "Aadhaar card", provided_by: "CUSTOMER" },
  { key: "land_7_12_8a", label: "7-12 / 8A land record", provided_by: "CUSTOMER" },
  { key: "bank_details", label: "Bank details", provided_by: "CUSTOMER" },
  { key: "insurance", label: "Insurance", provided_by: "DEALER" },
  { key: "screen_report", label: "RTO screen report", provided_by: "DEALER" },
  { key: "dealer_certificate", label: "Dealer certificate", provided_by: "DEALER" },
  { key: "model_certificate", label: "Model certificate", provided_by: "DEALER" },
  { key: "online_application", label: "Online application", provided_by: "CUSTOMER" },
  { key: "approval_letter", label: "Approval letter", provided_by: "CUSTOMER" },
] as const;

export const PASSING_STEPS = [
  { field: "form22_printed", label: "1. Invoice made & Form 22 printed" },
  { field: "sent_to_insurance", label: "2. Invoice + Aadhaar + PAN/Voter ID sent to insurance group" },
  { field: "insurance_received", label: "3. Insurance received" },
  { field: "set_sent_for_passing", label: "4. Full set sent for passing (company invoice, chassis print, dealer invoice, Form 22, Aadhaar, PAN/Voter ID, 7-12-8A)" },
  { field: "rto_receipt_received", label: "5. RTO payment receipt received" },
  { field: "screen_report_received", label: "6. RTO screen report received" },
  { field: "subsidy_file_created", label: "7. Subsidy file created (same date as RTO invoice)" },
] as const;
