# Add the missing Create Booking action

## User-facing change
- Add a **Create Booking** button to the Inquiry Detail page header.
- Show it only while the inquiry is eligible for booking; hide it for `BOOKED`, `DELIVERED`, and `LOST` inquiries.
- Link the button to the existing booking form and pass the current inquiry ID so customer, inquiry, tractor, and salesman details load automatically.
- Keep the existing Inquiry Detail UI and edit controls unchanged.

## Verification
- Open an active inquiry and confirm **Create Booking** opens the prefilled booking form.
- Create a booking and confirm the app returns to the new Booking Detail page.
- Confirm the button is absent for booked, delivered, and lost inquiries.

## Technical scope
- Frontend-only change in the existing Inquiry Detail route; no database or authentication changes.