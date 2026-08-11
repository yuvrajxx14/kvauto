# KrushiVidhya

Build the SALES MODULE for my dealership management system.

Business: KrushiVidhya Automobiles
Business type: Mahindra Tractor Dealership

This is an internal dealership ERP. Do NOT build this as a generic CRM. The workflow must be specifically designed for tractor dealership sales.

SALES MODULE — CORE WORKFLOW

The complete sales workflow is:

CUSTOMER INQUIRY
→ FOLLOW-UP
→ DEMO / VISIT
→ NEGOTIATION
→ BOOKING
→ TRACTOR ALLOCATION
→ DELIVERY

A customer can also become:

LOST

The system must track the complete history of every inquiry.

1. SALES DASHBOARD

Create a Sales Dashboard showing:

Today's numbers

New inquiries

Follow-ups due today

Overdue follow-ups

Customer visits

Demos

Bookings

Expected deliveries

Current pipeline

New

Contacted

Follow-up

Demo

Negotiation

Booked

Delivered

Lost

Performance

Salesman-wise inquiries

Salesman-wise follow-ups

Salesman-wise bookings

Salesman-wise deliveries

Conversion %

Model-wise demand

Alerts

Show prominently:

Overdue follow-ups

Inquiries without next follow-up date

Hot leads with no recent activity

Bookings pending tractor allocation

Expected deliveries approaching

Lost leads requiring review

Use KPI cards, charts and tables.

2. CUSTOMER INQUIRY

Create a New Inquiry form.

Customer information

Fields:

Customer Name

Mobile Number

Alternate Mobile

Village

Taluka

District

Full Address

Customer Type:

Farmer

Contractor

Commercial

Other

Inquiry information

Inquiry Number — automatically generated

Inquiry Date — automatic

Salesman — automatically assigned to logged-in salesman

Lead Source

Tractor Model

HP

Variant

Expected Purchase Date

Purchase Purpose

Exchange Required — Yes/No

Finance Required — Yes/No

Subsidy Required — Yes/No

Expected Budget

Competitor Tractor

Remarks

Lead Source options:

Walk-in

Existing Customer

Reference

Village Visit

Phone Call

WhatsApp

Website

Advertisement

Camp/Event

Other

3. DUPLICATE CUSTOMER / INQUIRY CONTROL

Before creating a new customer, check whether the mobile number already exists.

If the customer already exists:

Show:

"Customer already exists."

Display existing customer information and previous inquiries.

Allow the salesman to:

Open existing customer

Create a new inquiry for the existing customer

View previous inquiries

View previous purchases

View service history if available later

Do NOT create duplicate customers unnecessarily.

A customer can have multiple inquiries over time.

4. INQUIRY STATUS

Every inquiry must have one of these statuses:

NEW

Newly created inquiry.

CONTACTED

Salesman has contacted the customer.

FOLLOW-UP

Customer is interested and follow-up is required.

DEMO

Demo/field demonstration is planned or completed.

NEGOTIATION

Price/product discussion is active.

BOOKED

Customer has confirmed purchase.

DELIVERED

Tractor has been delivered.

LOST

Customer did not purchase.

Status must be clearly visible throughout the application.

5. FOLLOW-UP SYSTEM

This is one of the MOST IMPORTANT parts of the Sales Module.

Every active inquiry must have a Next Follow-Up Date.

Create a Follow-Up form containing:

Inquiry

Customer

Salesman

Follow-up date

Follow-up time

Contact method

Discussion

Customer response

Customer interest level

Competitor information

Expected purchase date

Next action

Next follow-up date

Remarks

Contact method:

Phone

WhatsApp

Visit

Showroom Visit

Demo

Other

Interest:

HOT

WARM

COLD

After saving a follow-up, automatically create/update the next follow-up.

Keep a complete Follow-Up History.

Example:

10 Aug — Called — Interested — Follow up after 3 days

13 Aug — Called — Wants price discussion — Follow up tomorrow

14 Aug — Visit — Negotiation — Follow up on 18 Aug

The salesman should be able to see the complete history.

6. FOLLOW-UP CONTROL

Create three separate lists:

TODAY

Follow-ups due today.

OVERDUE

Follow-ups whose due date has passed and are not completed.

UPCOMING

Future follow-ups.

Overdue follow-ups should be visually prominent.

Do NOT allow an active inquiry to remain without a next follow-up date.

If a salesman completes a follow-up but does not enter the next follow-up date, show a warning.

7. SALESMAN ACCESS

Each salesman should only see:

Their own inquiries

Their own follow-ups

Their own customers/leads

Their own bookings

Their own performance

They should NOT be able to see or modify another salesman's customers unless management gives permission.

Management roles should see all sales data.

8. CUSTOMER PROFILE

Create a detailed customer profile page.

At the top show:

Customer Name
Mobile
Village
Assigned Salesman

Then show tabs:

Overview

Customer information.

Inquiries

All inquiries of this customer.

Follow-ups

Complete follow-up history.

Bookings

All bookings.

Tractors

Purchased tractors.

Service

Service history.

Documents

Customer documents.

Activity

Complete system activity history.

The Service, Documents and other tabs can initially show "Module coming soon" if those modules have not yet been built, but the database structure should be designed so they can connect later.

9. INQUIRY DETAIL PAGE

Create a detailed Inquiry page.

Show:

Customer

Customer details.

Tractor Requirement

Model, HP, variant, budget, exchange, finance, subsidy.

Sales Pipeline

Display visually:

NEW
→ CONTACTED
→ FOLLOW-UP
→ DEMO
→ NEGOTIATION
→ BOOKED
→ DELIVERED

Follow-Up

Next follow-up prominently displayed.

Follow-Up History

Chronological timeline.

Salesman

Assigned salesman.

Activity Timeline

Every important action performed on this inquiry.

10. DEMO MANAGEMENT

Create demo tracking.

Fields:

Inquiry

Customer

Tractor model

Demo date

Demo location

Salesman

Demo status

Customer feedback

Competitor present

Remarks

Demo statuses:

PLANNED
→ COMPLETED
→ CANCELLED

After a completed demo, require the salesman to enter customer feedback and next action.

11. NEGOTIATION

When inquiry reaches NEGOTIATION, track:

Tractor model

Quoted price

Discount

Accessories

Exchange value

Finance

Subsidy

Final expected price

Customer demand

Competitor quotation

Remarks

Keep quotation/negotiation history.

If the price is changed, do not overwrite history.

Record:

Previous amount

New amount

Changed by

Date/time

12. BOOKING

When customer confirms purchase, provide a Convert to Booking button.

Booking must be created from the inquiry.

Automatically carry forward:

Customer

Mobile

Salesman

Tractor model

Variant

Quoted price

Exchange

Finance

Subsidy

Booking fields:

Booking Number

Booking Date

Tractor Model

Variant

Final Price

Booking Amount

Payment Mode

Expected Delivery Date

Finance Required

Finance Company

Exchange Required

Exchange Tractor Details

Subsidy Required

Remarks

After booking:

Inquiry status = BOOKED

Do NOT allow a salesman to manually change a booked inquiry back to an earlier stage without management permission.

13. BOOKING PAYMENT

Record booking payment:

Amount

Date

Payment Mode

Cash

Bank

UPI

Cheque

Reference Number

Remarks

Calculate:

Total Booking Amount
Amount Received
Balance Booking Amount

14. TRACTOR ALLOCATION

After booking, provide:

ALLOCATE TRACTOR

The salesman/authorized employee should be able to select a tractor from the available tractor stock.

Search/select by:

Chassis Number

Engine Number

Model

Variant

Only tractors with status:

AVAILABLE

can be selected.

Once allocated:

Tractor status becomes:

RESERVED

Store:

Chassis number

Engine number

Model

Allocation date

Booking

Customer

Allocated by

Do NOT build the complete Tractor Stock module yet.

Just create the database relationship/interface needed to connect to the future Tractor Stock Module.

15. DELIVERY HANDOVER

Once the Delivery Module is created later, the booking should be passed to it.

For now create:

READY FOR DELIVERY

status.

The Sales Module should show:

Booking

Customer

Tractor

Chassis

Engine

Expected delivery date

Payment status

Finance status

Delivery status

Do not build the complete billing/RTO/insurance workflow in this module.

That will be handled in separate modules.

16. LOST INQUIRY

If customer does not purchase, allow:

MARK AS LOST

But require:

Lost Reason

Options:

Price

Competitor

Finance Issue

Subsidy Issue

No Requirement

Delayed Purchase

Purchased Elsewhere

Customer Not Responding

Other

Also require:

Lost date

Competitor brand/model

Remarks

Once marked LOST, retain the entire inquiry and follow-up history.

Do NOT permanently delete it.

17. SALES REPORTS

Create reports for:

Inquiry Report

Filters:

Date

Salesman

Village

Model

Source

Status

Follow-Up Report

Due today

Overdue

Upcoming

Salesman-wise

Conversion Report

Calculate:

Inquiry → Booking %

Booking → Delivery %

Overall Inquiry → Delivery %

Salesman Performance

For each salesman:

Total inquiries

Contacted

Follow-ups

Demos

Negotiations

Bookings

Deliveries

Lost

Conversion %

Overdue follow-ups

Model Demand

Show:

Inquiry count

Booking count

Delivery count

Conversion %

18. VILLAGE-WISE SALES

Because this is a tractor dealership, village-level tracking is important.

Create village-wise reporting:

Village

Total inquiries

Active inquiries

Bookings

Deliveries

Lost

Conversion %

Allow management to identify villages with high potential.

19. SEARCH

Create Sales Module search.

Search by:

Customer name

Mobile number

Inquiry number

Booking number

Chassis number

Engine number

Village

Search should be fast and available from the Sales Module.

20. ACTIVITY LOG

Every important action must be recorded:

Inquiry created

Inquiry edited

Status changed

Follow-up created

Follow-up completed

Price changed

Booking created

Payment added

Tractor allocated

Inquiry marked lost

Record:

User

Date

Time

Action

Record

Employees should not be able to delete activity logs.

21. PERMISSIONS

CEO / Dealer

Full access.

Manager

Full Sales access and reporting.

Salesman

Can:

Create inquiries

View own inquiries

Edit own inquiries

Create follow-ups

Complete follow-ups

Create demos

Update pipeline

Create booking requests

Cannot:

Delete inquiries

View other salesmen's leads

Change important financial values without authorization

Modify audit history

Receptionist

Can create basic customer/inquiry records but cannot access sensitive sales information.

22. DATABASE

Create proper relational database tables.

At minimum:

CUSTOMERS

id

customer_name

mobile

alternate_mobile

village

taluka

district

address

customer_type

created_at

created_by

INQUIRIES

id

inquiry_number

customer_id

salesman_id

inquiry_date

source

model

hp

variant

expected_purchase_date

budget

exchange_required

finance_required

subsidy_required

competitor

status

interest_level

remarks

created_at

updated_at

FOLLOWUPS

id

inquiry_id

customer_id

salesman_id

followup_date

followup_time

contact_method

discussion

customer_response

interest_level

next_action

next_followup_date

status

remarks

created_at

DEMOS

id

inquiry_id

demo_date

location

salesman_id

status

feedback

remarks

NEGOTIATIONS

id

inquiry_id

quoted_price

discount

accessories

exchange_value

finance

subsidy

final_expected_price

competitor_quote

remarks

created_by

created_at

BOOKINGS

id

booking_number

inquiry_id

customer_id

salesman_id

booking_date

tractor_model

variant

final_price

booking_amount

amount_received

balance

expected_delivery_date

finance_required

finance_company

exchange_required

subsidy_required

status

created_at

BOOKING_PAYMENTS

id

booking_id

amount

payment_date

payment_mode

reference_number

remarks

TRACTOR_ALLOCATIONS

id

booking_id

tractor_stock_id

chassis_number

engine_number

allocated_date

allocated_by

LOST_INQUIRIES

id

inquiry_id

lost_reason

competitor

lost_date

remarks

ACTIVITY_LOGS

id

user_id

entity_type

entity_id

action

old_value

new_value

created_at

Use proper foreign keys and indexes.

23. IMPORTANT BUSINESS RULES

No duplicate customers based on mobile number unless management overrides.

Every active inquiry must have a next follow-up date.

Overdue follow-ups must be visible on dashboard.

A salesman cannot see another salesman's leads.

Booked inquiries cannot be casually edited.

Lost inquiries cannot be deleted.

Booking payment must update balance automatically.

A tractor can only be allocated if its stock status is AVAILABLE.

One tractor cannot be allocated to two bookings.

Every important change must create an audit log.

Do not use hardcoded demo data for actual functionality.

Do not create fake buttons that do nothing.

All forms must have proper validation.

All lists must support search, filtering and sorting.

Make the UI responsive for desktop, tablet and mobile.

24. UI DESIGN

Create a professional dealership ERP interface.

Sidebar:

SALES

Dashboard

Customers

Inquiries

Follow-Ups

Demos

Negotiations

Bookings

Delivery Ready

Reports

Use clean tables with:

Status badges

Search

Filters

Sorting

Pagination

Quick actions

On mobile, forms should remain easy to use.

The most important information should be visible without opening multiple screens.

25. DEVELOPMENT INSTRUCTION

Build ONLY the SALES MODULE right now.

Do NOT build:

Service

Parts

Accounting

Loan

RTO

Subsidy

HR

Payroll

Complete tractor inventory

Complete delivery module

However, design the database relationships so these modules can be connected later without rebuilding the Sales Module.

Use real database-backed functionality, authentication and role-based permissions.

Do not use hardcoded data.

After completing the module, test the entire workflow:

Customer → Inquiry → Follow-up → Demo → Negotiation → Booking → Payment → Tractor Allocation → Ready for Delivery

Also test:

Inquiry → Lost

and

Existing Customer → New Inquiry

Make sure all data remains connected and the complete customer/inquiry history can be viewed.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://kvauto.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cd0e9c90-cdf8-4d72-b5f2-fd65b4aef822).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
