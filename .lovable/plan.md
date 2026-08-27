# Role-based access + UI cleanup

Two parts: (1) real role-based permissions across the app, (2) the specific UI fixes you listed.

## 1. Permission model

A single source of truth (`src/lib/permissions.ts`) derives a capability set from the signed-in user's roles, and every Add / Edit / Delete control is rendered from it. Nothing is hidden-only: the database gets matching rules so a hidden button can't be worked around.

Capabilities per role:

| Area | CEO / Manager / Sales Mgr | Salesman | Mechanic | Sparepart | Accountant |
|---|---|---|---|---|---|
| Inquiry / Customer | add, edit, delete | add, edit | – | – | – |
| Booking | add, edit, cancel, delete | add, edit | – | – | – |
| Stock + allocation | add, edit, delete | allocate | – | – | add, edit (no delete) |
| Delivery | full | create/edit | – | – | edit |
| Subsidy / Passing | full | check + update | – | – | edit |
| Payments / Accounting | full | – | – | – | add, edit |
| Service register | full | register | register, edit, close | register, edit | – |
| Job cards | full | – | open, edit, close | no access | – |
| Spare requests | full | raise | raise | accept, issue, add, edit, close | – |
| Route planner | full | – | create, edit | – | – |
| Masters (products, villages, users, team) | full | read | read | read | read |

Only CEO / Manager / Sales Manager ever see a Delete button, anywhere.

Anything a role cannot do is hidden from the sidebar too (e.g. mechanics don't get the Spare Parts menu, accountants don't get Job Cards).

## 2. Role-aware staff pickers

Today every picker lists all staff. Fix: staff list is returned with roles, and each picker filters by the role that fits.

- Inquiry / Booking "Salesman" → salesman + sales manager + CEO-as-fallback only if no salesman exists
- Job card / service "Assign to" → mechanic + service manager only
- Route planner "Assigned to" → mechanic + service manager only
- Spare request approver/issuer → sparepart manager + management

## 3. Missing buttons

Add the Add / Edit / Delete actions that are currently missing, gated by the table above: delete on inquiries, customers, bookings, stock, service jobs, routes, spare requests, products, villages; edit on records where only view exists today.

## 4. The specific UI fixes

- Delivery page: hide "Subsidy tracking" and "Proceed to passing" once subsidy and passing are complete.
- Delivery page: remove the duplicate Gate pass and Delivery challan print buttons from the top bar — keep only the ones inside the Gate pass section.
- Remove the customer-documents print module (route + link).
- Remove "Upload company invoice" and "Chassis print" upload options from stock/delivery/passing.
- Passing screen: hide the "Open" button when passing is already done (show status instead).
- Remove the subsidy checklist block at the bottom of the passing page.
- Service register form: rename "Create job card" to "Register service" — registering a complaint, not opening a job card. Job cards stay a separate step.

## Technical notes

- New DB migration: management DELETE policies on the tables that currently deny delete; a `staff_directory_with_roles()` security-definer function so pickers can filter by role without exposing `user_roles` broadly; role checks added to write policies (e.g. accountant may update `deliveries` / `passing_records` / `subsidy_cases` / `tractor_stock`, mechanic may not touch bookings).
- `src/lib/permissions.ts` exports `usePerms()` built on the existing `useMe()`; components use `perms.can("booking.delete")` style checks rather than inline role strings.
- Sidebar groups filter through the same permission set.
