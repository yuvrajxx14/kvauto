# Workshop Department

A second department alongside Sales, run by a Workshop Manager: service register, priority handling for problem/complaint jobs, and a village route planner for pending field visits.

## Sidebar

New "Workshop" group (visible to workshop manager + management):
- Workshop Dashboard
- Service Register
- Route Planner

Sales stays exactly as it is today.

## Roles

Add `workshop_manager` and `mechanic` roles to the existing role system. Team & Roles page gets the new options. Workshop pages are open to workshop manager, mechanic (read/update own jobs) and management; salesmen do not see the Workshop group.

## Service Register

One record per job card:
- Customer (reuse existing customer master, with quick-add for walk-ins), mobile, village
- Tractor: model + chassis/registration number, hours reading
- Service type: **General Service** or **Problem / Complaint** (the register's main filter)
- Problem category (only for Problem jobs): Engine, Hydraulic, Transmission/Clutch, Electrical, Brakes/Steering, Body/Other — these auto-set priority to High
- Service mode: Workshop In-house or Field Visit
- Status: Open → In Progress → Awaiting Parts → Completed → Delivered / Cancelled
- Priority: Urgent / High / Normal (auto-High for Problem, editable)
- Assigned mechanic, promised date, complaint text, work done, parts used (free text + amount), labour amount, total, remarks

Register page: tab filter General service / Problem / All, plus status, priority, mechanic, village and date filters, and search on customer/mobile/chassis. Problem jobs sort first (priority, then oldest promised date) so complaints get served before routine service.

Job card detail page: status timeline, edit work details, log parts/labour, mark complete, and print a service job card / invoice using the existing print shell.

## Workshop Dashboard

KPIs: open jobs, problem jobs pending, overdue promised dates, completed today, revenue this month. Lists: high-priority problem queue, overdue jobs, pending field visits by village.

## Route Planner

For jobs with Service mode = Field Visit and status not completed:
- Village list with pending job counts, oldest pending age and problem-job count
- Select villages (checkboxes) plus a visit date and assigned mechanic
- Builds a route: villages ordered by problem count then pending age, listing every job (customer, mobile, model, complaint) per village
- Save as a route plan (date, mechanic, villages, jobs) and print a field-visit sheet; jobs on a saved route show the planned visit date

## Technical notes

- Migration: extend `app_role` enum with `workshop_manager`, `mechanic`; new tables `service_jobs`, `service_job_items` (optional parts lines), `service_routes`, `service_route_stops`; each with GRANTs, RLS (staff read, workshop/management write, mechanic can update assigned jobs), `updated_at` trigger, activity logging via existing `log_activity`; job number sequence `SRV-YYMM-0001` via trigger like bookings.
- Helper `is_workshop(_user_id uuid)` security-definer function mirroring `is_management`.
- Frontend: `src/lib/workshop.ts` (constants + query hooks), routes under `src/routes/_authenticated/workshop/`, print route `src/routes/_authenticated/print/job-card.$jobId.tsx` and `route-sheet.$routeId.tsx`; reuse existing `PageHeader`, `EmptyState`, `ModelSelect`, badges, print CSS.
- No changes to sales/booking/delivery logic or existing tables other than the role enum.
