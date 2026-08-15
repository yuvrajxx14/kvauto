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

/** Papers that make up the physical passing set sent to the RTO. */
export const PASSING_SET_DOCS = [
  { key: "INVOICE", label: "Tax invoice (dealer invoice)", source: "GENERATED" },
  { key: "FORM22", label: "Form 22 (roadworthiness certificate)", source: "GENERATED" },
  { key: "AADHAAR", label: "Aadhaar card", source: "CUSTOMER" },
  { key: "PAN", label: "PAN card", source: "CUSTOMER" },
  { key: "VOTER_ID", label: "Voter ID", source: "CUSTOMER", optional: true },
  { key: "7_12", label: "7/12 extract", source: "CUSTOMER" },
  { key: "8A", label: "8A extract", source: "CUSTOMER" },
  { key: "COMPANY_INVOICE", label: "Mahindra company purchase invoice", source: "VEHICLE" },
  { key: "CHASSIS_PRINT", label: "Chassis print", source: "VEHICLE" },
] as const;

/** Subsidy-file papers, mapped to where the scan can be pulled from. */
export const SUBSIDY_FILE_DOCS = [
  { key: "dealer_invoice", label: "Dealer invoice", source: "GENERATED" },
  { key: "money_receipt", label: "Money receipt", source: "GENERATED" },
  { key: "aadhaar", label: "Aadhaar card", source: "CUSTOMER", docType: "AADHAAR" },
  { key: "land_7_12", label: "7/12 extract", source: "CUSTOMER", docType: "7_12" },
  { key: "land_8a", label: "8A extract", source: "CUSTOMER", docType: "8A" },
  { key: "bank_details", label: "Bank details", source: "CUSTOMER", docType: "BANK_DETAILS" },
  { key: "insurance", label: "Insurance policy", source: "MANUAL" },
  { key: "screen_report", label: "RTO screen report", source: "MANUAL" },
  { key: "dealer_certificate", label: "Dealer certificate", source: "MANUAL" },
  { key: "model_certificate", label: "Model certificate", source: "MANUAL" },
  { key: "online_application", label: "Online application", source: "MANUAL" },
  { key: "approval_letter", label: "Approval letter", source: "MANUAL" },
] as const;

export type PassingStageKey =
  | "APPLICATION"
  | "APPROVAL"
  | "PAYMENT"
  | "PRINT_SET"
  | "SENT_TO_RTO"
  | "SCREEN_REPORT"
  | "NUMBER_PLATE"
  | "FITMENT"
  | "SUBSIDY_PRINT"
  | "SUBSIDY_UPLOAD";
