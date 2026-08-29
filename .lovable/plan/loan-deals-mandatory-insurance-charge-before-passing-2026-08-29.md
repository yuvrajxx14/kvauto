# Loan deals: mandatory insurance charge before Passing

For LOAN bookings, an insurance amount must be entered (added to the customer balance) and the full balance must be received before anyone can open the Passing window. No skip option — insurance is always mandatory.

## 1. Database (migration)

- Add two columns to `public.bookings`: `insurance_amount numeric not null default 0` and `insurance_charged boolean not null default false`.
- New RPC `charge_loan_insurance_atomic(_booking_id, _amount)` (security definer, same ownership check as other booking RPCs):
  - Rejects if the booking is not a LOAN deal, if insurance was already charged, or if amount <= 0.
  - Adds the amount to `bookings.extra_charges`, sets `insurance_amount` + `insurance_charged = true`.
  - Posts an `INSURANCE` debit entry to the customer ledger and an activity log entry — so the amount immediately shows in outstanding.

## 2. Delivery page — popup gate on "Proceed to passing"

- For LOAN deals, the **Proceed to passing** button no longer navigates directly. It opens a dialog that walks through two steps:
  1. **Insurance amount** (if not charged yet): required number field; saving calls `charge_loan_insurance_atomic`, which adds it to the balance.
  2. **Payment**: shows the new outstanding (now including insurance) with the existing Receive payment dialog inline; the "Open passing" button stays disabled until outstanding is ₹0.
- Cash deals are unchanged (direct link).

## 3. Passing page — hard block (covers direct URL / passing list)

- If the booking is a LOAN deal and (`insurance_charged` is false OR outstanding >= ₹1), the passing page shows a blocking card instead of the steps: "Insurance and full payment required before passing", with the insurance popup and Receive payment dialog right there so staff can clear it without navigating away.
- Once insurance is charged and outstanding is zero, the normal 10-step passing flow appears.
- The existing Step 3 "Payment check" hint is updated to mention the insurance charge for loan deals.

## 4. Customer 360 / subsidy views

- Show the insurance amount (when charged) in the booking money summary so the ledger story is clear.

## Technical notes

- `post_extra_charge_atomic` stays as-is; insurance gets its own RPC so it can't be double-charged and is tracked explicitly on the booking.
- Outstanding calculations already include `extra_charges`, so the insurance amount flows into outstanding everywhere automatically (delivery checklist, gate pass, passing payment check).
- Existing delivered LOAN bookings without insurance will hit the same gate the next time someone opens their passing file — intended, so old deals also get regularised.
- Cash deals are completely unaffected.
