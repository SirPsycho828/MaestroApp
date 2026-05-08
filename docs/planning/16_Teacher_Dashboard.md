# Teacher Dashboard

## Overview

The teacher dashboard is the primary landing page after login. It provides a schedule view of upcoming lessons, action prompts for lessons needing review, a snapshot of key metrics, and contextual nudges for incomplete setup tasks. The dashboard prioritizes "what do I need to do right now" over comprehensive data browsing.

## Dependencies

- `02_Database_Schema.md` -- `lessons`, `teacherStudents`, `teacherProfiles`, `studentCredits`, `transactions` collections
- `03_API_Endpoints.md` -- `getTeacherSchedule`, `getTeacherAnalytics`
- `04_UI_Design_System.md` -- Card patterns, badge styles, calendar grid, empty states
- `05_Teacher_Onboarding.md` -- Post-wizard prompts for incomplete setup
- `08_Lesson_Scheduling.md` -- Lesson status lifecycle, completion, no-show
- `13_Lesson_Workflow.md` -- Post-lesson review prompt cards

---

## Page Layout

The dashboard uses a two-column layout on desktop (schedule left, sidebar right) and a single stacked column on mobile.

```
┌────────────────────────────────────────────────────┐
│  Action Cards (full width, if any)                 │
├────────────────────────────────┬───────────────────┤
│                                │                   │
│  Schedule View                 │  Sidebar          │
│  (weekly calendar)             │  - Today's Summary│
│                                │  - Monthly Stats  │
│                                │  - Quick Actions  │
│                                │                   │
└────────────────────────────────┴───────────────────┘
```

On mobile, order is: Action Cards, Today's Summary, Schedule View, Monthly Stats, Quick Actions.

---

## Action Cards

Dismissible cards at the top of the dashboard. These represent items requiring the teacher's attention right now.

### Lessons to Review

Lessons past their end time that are still in `scheduled` status (see `13_Lesson_Workflow.md`).

| Card Content | Details |
|-------------|---------|
| Heading | "Lessons to Review" with count badge |
| List | Student name, lesson type, date/time for each |
| Actions per item | "Complete" and "No-Show" buttons |
| Stale indicator | Warning badge on items 7+ days old |

Tapping "Complete" navigates to the lesson detail page with notes and practice task form. "No-Show" shows a confirmation dialog inline.

If zero lessons need review, this card is hidden.

### Unpaid Lessons

Lessons where `creditDeducted: false` (teacher manually booked without sufficient student credits).

| Card Content | Details |
|-------------|---------|
| Heading | "Unpaid Lessons" with count badge |
| List | Student name, lesson type, date |
| Note | "These lessons were booked without credits. Follow up with your students." |

No actions on these cards -- resolution happens outside the app in MVP. The card serves as a reminder.

### Setup Prompts

Shown when the teacher's profile is incomplete (see `05_Teacher_Onboarding.md` post-wizard state).

| Condition | Card |
|-----------|------|
| Zero students | "Invite your first student" with "Send Invite" CTA |
| Stripe not connected + has paid lesson types | "Connect payments to receive bookings" with "Set Up Payments" CTA |
| No locations defined | "Add your teaching locations" with "Add Location" CTA |

Setup prompt cards are dismissible. Once dismissed, they do not reappear for that condition unless the user reloads the page. Dismissal state is stored in `localStorage`, not Firestore.

---

## Schedule View

The primary component of the dashboard. A weekly calendar showing booked lessons.

### View Modes

| Mode | Default | Toggle |
|------|---------|--------|
| Week | Yes (desktop) | Top-right toggle: "Day / Week / Month" |
| Day | Yes (mobile) | Same toggle |
| Month | No | Available but not default |

### Weekly View Layout

- Columns: 7 days (Monday through Sunday, or Sunday through Saturday per locale)
- Rows: Time slots from the teacher's earliest to latest availability, in 30-minute increments
- Current time: horizontal red line indicator
- Today's column: subtle `--brand-50` background highlight

### Lesson Cards on Calendar

Each booked lesson appears as a card positioned on the time grid.

| Element | Content |
|---------|---------|
| Student name | Bold, truncated if long |
| Lesson type | Below name, smaller text |
| Location | Icon + name, smallest text |
| Left border | Color-coded by status (see `04_UI_Design_System.md` badges) |

Card height corresponds to lesson duration. A 60-minute lesson is twice the height of a 30-minute one.

### Interactions

- **Click a lesson card**: opens a lesson detail panel (slide-in from right on desktop, full-screen on mobile)
- **Click an empty slot**: opens "Add Lesson" form pre-filled with that date/time (see `08_Lesson_Scheduling.md` teacher manual booking)
- **Navigate weeks**: left/right arrows or swipe on mobile

### Lesson Detail Panel

| Section | Content |
|---------|---------|
| Header | Student name, lesson type, status badge |
| Time | Date, start-end time, timezone |
| Location | Location name and address/link |
| Credit | "Credit deducted" or "Unpaid" badge |
| Actions | Vary by status (see below) |

**Actions by status**:

| Status | Available Actions |
|--------|------------------|
| Scheduled (future) | Cancel, Reschedule |
| Scheduled (past) | Complete, No-Show, Cancel |
| Completed | View/Edit Notes, View/Edit Practice Tasks |
| Cancelled | View only (no actions) |
| No-show | View only |

---

## Today's Summary

Sidebar card showing a quick snapshot of the current day.

| Element | Content |
|---------|---------|
| Lesson count | "3 lessons today" |
| Next lesson | "Next: Piano with Alice at 2:00 PM" with countdown ("in 45 min") |
| Remaining | "2 more after that" |

If no lessons today: "No lessons scheduled today."

---

## Monthly Stats

Sidebar card showing basic analytics for the current month. Data from `getTeacherAnalytics` (see `03_API_Endpoints.md`).

| Metric | Display | Calculation |
|--------|---------|-------------|
| Revenue | "$1,240" | Sum of `transactions.amount` where type is a payment, current month |
| Lessons | "18" | Count of `lessons` with `status: 'completed'`, current month |
| Attendance | "94%" | completed / (completed + no_show), current month |
| vs. Last Month | "+12%" or "-5%" | Comparison with same metrics from previous month |

Each metric is a compact stat with label, value, and trend arrow (green up or red down).

### Empty State

First month with no data: "Complete your first lesson to see stats here."

---

## Quick Actions

Sidebar card with shortcut buttons for common tasks.

| Action | Icon | Navigates To |
|--------|------|-------------|
| Invite Student | UserPlus | `/students` (with invite modal triggered) |
| Add Lesson Type | BookOpen | `/settings/lesson-types` |
| Block Time Off | CalendarOff | `/availability` |
| View All Students | Users | `/students` |

---

## Student Roster Page (`/students`)

Linked from Quick Actions and sidebar navigation. Not part of the dashboard itself, but closely related.

### Active Students List

| Column | Content |
|--------|---------|
| Name | Display name (clickable, opens student profile) |
| Credits | Balance with color coding (see `11_Credit_System.md` teacher visibility) |
| Subscription | "Active", "Past Due", "None" badge |
| Last Lesson | Relative date ("3 days ago") or "Never" |
| Next Lesson | Date or "None scheduled" |

Sortable by any column. Default sort: alphabetical by name.

### Student Profile Page

Accessed by clicking a student's name. Shows:

- Student info (name, email, phone if provided)
- Credit balance and subscription status
- Lesson history (chronological list, see `13_Lesson_Workflow.md`)
- "Book Lesson" button (teacher manual booking)
- "Deactivate Student" in settings section (see `06_Student_Invitation.md`)

---

## Navigation

Teacher sidebar navigation (desktop) / bottom tab bar (mobile):

| Item | Icon | Route | Badge |
|------|------|-------|-------|
| Dashboard | Home | `/dashboard` | Count of lessons to review |
| Schedule | Calendar | `/dashboard` (scrolls to schedule) | -- |
| Students | Users | `/students` | -- |
| Group Classes | UsersRound | `/group-classes` | -- |
| Settings | Settings | `/settings` | Red dot if setup incomplete |

Settings sub-pages (accessible from `/settings`):
- Profile
- Lesson Types
- Availability
- Locations
- Payments (Stripe)
- Calendar Sync
- Notifications

---

## Gaps & Assumptions

- **Assumption**: Analytics are computed on-demand by `getTeacherAnalytics`, not pre-aggregated. At single-teacher scale this is fine. If query performance degrades with hundreds of lessons, add a monthly aggregation document updated by a Cloud Function.
- **Assumption**: The schedule view uses client-side rendering with Firestore real-time listeners (`onSnapshot`) so new bookings appear immediately without refresh.
- **Assumption**: Dashboard and Schedule are the same page. The sidebar "Schedule" link scrolls to the schedule section on the dashboard rather than being a separate page.
- **Gap**: No drag-to-reschedule on the calendar. Teachers must open the lesson detail and use the reschedule flow. Drag-and-drop rescheduling is post-MVP.
- **Gap**: No calendar export (PDF, print view). Teachers who want a printed schedule must use browser print. A print-friendly stylesheet is post-MVP.
- **Gap**: No multi-day or multi-week lesson view beyond the month toggle. A "list view" showing all upcoming lessons as a flat list (alternative to calendar grid) is post-MVP.
- **Gap**: Revenue metric does not account for refunds processed through Stripe Dashboard. It only sums positive `transactions.amount` values. Refund tracking is post-MVP.
- **Gap**: No "today" button to quickly return to the current week/day after navigating to a different week.  
