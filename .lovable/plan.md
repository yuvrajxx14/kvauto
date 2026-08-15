# Sales → Delivery → Passing: full workflow upgrade

Large scope, so it is split into 5 phases. Each phase is shippable on its own and I will do them in order.

## Phase 1 — Product master + booking money fixes

**Product master UI**
The products table already exists in the database with your 23 models loaded, but no screen uses it yet — model dropdowns still read a hardcoded list.
- New "Products" page (Master section in sidebar): list, add, edit, activate/deactivate a model (model name, HP, category, sort order). Add/edit/deactivate limited to CEO/Manager; everyone can see the list.
- Inquiry (new/edit), Booking (new) and Stock forms switch to the live product list.

**Booking amount not showing as received (confirmed bug)**
Today booking creation records the deal price as receivable but records the booking amount as ₹0 received — it is never turned into an actual receipt. Fix: creating a booking also creates a booking receipt for the booking amount, so received/outstanding are right from the moment the booking is made. Payment mode (Cash / Bank / UPI / Cheque / Finance) is chosen on the booking form.

**Booking cancellation + refund**
- "Cancel booking" action on the booking detail page (management, or the owning salesman) with a reason.
- Cancelling releases any allocated tractor back to AVAILABLE, sets the booking to Cancelled, and records a refund entry in the ledger for whatever was collected. Reason, date, refund amount and who cancelled are stored in a new cancellation record — nothing is deleted.
- Cancelled bookings stay visible in lists with a Cancelled badge.

**Payment receipts everywhere**
Same "Receive payment" dialog also added to the Delivery page and the Accounting pages (collections list and customer ledger), so nobody has to open the booking to enter a receipt.

## Phase 2 — Stock check simplification + printing

**One save for stock checks**
Replace the four separate forms on the stock unit page with a single panel: NTIR (Passed / Failed) and PDI (Passed / Failed), one Save button. Saving updates inspection, PDI, delivery check and stock status together — when both pass, the unit becomes Available; if either fails the unit is held out of allocation.

**Print**
- Payment receipt print (money receipt with dealer header, customer, booking, amount in words, mode/reference).
- Delivery challan print.
- Documents print: pick which uploaded documents to include and print the selected set.
All print views are clean A4 print stylesheets from the app, no extra service needed.

## Phase 3 — Delivery wizard (use type, subsidy, payment rules)

Updating a delivery becomes a guided flow for the salesman:

```text
Use type?
├── Commercial  → payment check → pass
└── Agriculture → Online subsidy application done?
                  ├── No  → tag customer "Application pending"
                  └── Yes → Approved by government?
                            ├── Yes → payment check → pass
                            └── No  → tag customer "Approval pending"
```

**Payment check rule**
- Cash deal: full deal price must be received.
- Loan/finance deal: deal price + 2% document charge on the loan amount must be received (₹5,00,000 loan → ₹10,000 charge). The charge is auto-calculated and posted to the ledger so it shows in outstanding.

Delivery stores: use type, finance type, loan amount, subsidy application status, approval status. Salesmen and office staff can both update application/approval status later.

## Phase 4 — Post-delivery subsidy & insurance tracking

- Subsidy tracking list with the categories from the flow (application pending, approval pending, approved), updatable by salesman and office staff.
- When approval arrives more than 7 days after delivery — or the application was never filed — the app prompts the salesman to add a new insurance amount for that model; the amount is added to the customer's balance and appears in the ledger.
- Passing is blocked until deal price + 2% document charge + insurance (when applicable) are all received.

## Phase 5 — Passing & subsidy file

A Passing screen per delivered booking that walks your exact sequence with status per step and dates:
1. Invoice + Form 22 generated and printed; invoice + Aadhaar + PAN/Voter ID sent to insurance group.
2. Company invoice, chassis pencil print, dealer invoice, Form 22, Aadhaar, PAN/Voter ID, 7-12-8A assembled as one set and sent for passing; insurance forwarded to RTO group.
3. RTO payment receipt and screen report received (uploaded).
4. Subsidy file created — created automatically on the same date as the RTO invoice so numbers and dates never mismatch.
5. Subsidy checklist: dealer invoice, money receipt, Aadhaar, 7-12-8A, bank details, insurance, screen report, dealer certificate, model certificate, online application, approval letter — each tick-marked and printable as a cover checklist; customer-side items are marked "with customer".

## Technical notes

- Database work (all additive, nothing dropped): `products` UI wiring; `booking_cancellations`; delivery columns for use type / finance type / loan amount / subsidy + approval status; `subsidy_cases`; `insurance_charges`; `passing_records` with step statuses and subsidy checklist rows. GRANTs + RLS on every new table (salesman sees own records, management sees all, office staff can update subsidy/approval).
- `create_booking_atomic` extended to post the booking receipt; new `cancel_booking_atomic` (release stock, ledger refund, cancellation record); `complete_delivery_atomic` extended with use-type/subsidy/finance payment rules.
- Printing via dedicated print routes plus a print stylesheet; no new dependencies.
- Existing design system, sidebar style and auth structure stay unchanged.
