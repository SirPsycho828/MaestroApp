# Student Dashboard

## Overview

The student dashboard is the landing page after login. It answers three questions: "When is my next lesson?", "What should I practice?", and "Do I have enough credits?" The layout prioritizes upcoming lessons and open practice tasks. Students connected to multiple teachers see all information consolidated on one screen, grouped by teacher where appropriate.

## Dependencies

- `02_Database_Schema.md` -- `lessons`, `teacherStudents`, `studentCredits`, `practiceItems` collections
- `03_API_Endpoints.md` -- `getStudentSchedule`, `getStudentPracticeItems`, `getStudentCredits`
- `04_UI_Design_System.md` -- Card patterns, badge styles, progress bars, bottom tab navigation
- `08_Lesson_Scheduling.md` -- Cancellation and rescheduling from lesson cards
- `11_Credit_System.md` -- Credit display, low balance warning
- `13_Lesson_Workflow.md` -- Practice task checklist interaction

---

## Page Layout

Single-column layout on all screen sizes. Cards stack vertically in priority order.

```
┌─────────────────────────────┐
│  Next Lesson (hero card)    │
├─────────────────────────────┤
│  Practice Tasks (summary)   │
├─────────────────────────────┤
│  Credit Balances            │
├─────────────────────────────┤
│  Upcoming Lessons (list)    │
├─────────────────────────────┤
│  Recent Lesson Notes        │
└─────────────────────────────┘
```

---

## Next Lesson (Hero Card)

The topmost element. Shows the student's very next scheduled lesson across all teachers.

| Element | Content |
|---------|---------|
| Teacher name | "{Teacher name}" |
| Lesson type | e.g., "30-Minute Piano" |
| Date/time | "Tomorrow at 3:00 PM" or "Today at 3:00 PM" (relative when within 48 hrs, absolute otherwise) |
| Location | Location name. If virtual: "Zoom" with link icon. If in-person: address. |
| Countdown | "in 2 hours", "in 3 days" -- live-updating |
| Actions | "Cancel" and "Reschedule" buttons (secondary style) |

**Tap behavior**: opens lesson detail page (see `08_Lesson_Scheduling.md`).

**If virtual**: show a "Join" button with `--accent-500` styling that opens the virtual link. Only visible within 15 minutes of lesson start time.

**If no upcoming lessons**: replace the hero card with an empty state:
- "No upcoming lessons"
- Per-teacher "Book a Lesson" buttons (one per connected teacher)

---

## Practice Tasks Summary

A compact card showing open practice task status across all teachers.

| Element | Content |
|---------|---------|
| Heading | "Practice Tasks" |
| Count | "{X} tasks to complete" |
| Progress bar | Thin bar showing completed/total ratio across all tasks |
| Preview | First 2-3 uncompleted task descriptions, truncated |

**Tap behavior**: navigates to `/practice` (full practice dashboard, see `13_Lesson_Workflow.md`).

**If no open tasks**: show "All caught up!" with a green check icon. Card is still visible but compact.

---

## Credit Balances

One card per teacher the student is connected to. If connected to a single teacher, show one card. If multiple, stack them.

### Single-Teacher Card

| Element | Content |
|---------|---------|
| Teacher name | "{Teacher name}" |
| Balance | Large number: "4" with "credits" label |
| Subscription status | Badge: "Active", "Past Due", or hidden if no subscription |
| Renewal date | "Renews Jun 1" (if subscribed) |
| CTA | "Buy Credits" button (always visible) |

### Balance Visual States

| Condition | Style |
|-----------|-------|
| 3+ credits | `--brand-700` text, no badge |
| 1-2 credits | `--warning` text, yellow "Low" badge |
| 0 credits | `--error` text, red "Empty" badge, "Buy Credits" button promoted to primary style |
| Subscription past due | `--error` badge "Payment Failed", "Update Payment" link to Stripe billing portal |

### Multi-Teacher Display

Cards are stacked vertically, sorted by next lesson date (teacher with the soonest lesson first). Each card is independent.

---

## Upcoming Lessons

A chronological list of the next 2 weeks of scheduled lessons across all teachers.

### Lesson Row

| Element | Content |
|---------|---------|
| Date grouping | "Today", "Tomorrow", "Wednesday, Jun 18" -- lessons grouped under date headers |
| Time | "3:00 PM - 3:30 PM" |
| Lesson type | Name |
| Teacher | Teacher name (shown when connected to multiple teachers, hidden if only one) |
| Location | Name with icon (map pin for in-person, video for virtual) |
| Status badge | "Scheduled" (blue) |

**Tap behavior**: opens lesson detail page.

**Empty state**: "No lessons scheduled for the next 2 weeks." with per-teacher "Book a Lesson" buttons.

### "View More" Link

If lessons exist beyond 2 weeks, show a "View all upcoming" link at the bottom navigating to a full schedule page.

---

## Recent Lesson Notes

Shows notes from the last 3 completed lessons that have teacher notes attached.

### Note Card

| Element | Content |
|---------|---------|
| Teacher name | (if multi-teacher) |
| Lesson type + date | "Piano Lesson -- Jun 10" |
| Notes preview | First 2 lines of teacher's notes, truncated |
| Task count | "3 practice tasks" link |

**Tap behavior**: opens lesson detail showing full notes and practice tasks.

**Empty state**: hidden entirely if no recent lessons have notes. Do not show an empty card.

---

## Booking Flow Entry

### Per-Teacher Booking

Students book lessons from teacher-specific booking pages. Entry points:

| Location | Element |
|----------|---------|
| Hero card empty state | "Book a Lesson" button per teacher |
| Upcoming lessons empty state | "Book a Lesson" button per teacher |
| Bottom tab navigation | "Book" tab |
| Credit balance card | Teacher name is tappable, links to `/book/{teacherSlug}` |

### Multi-Teacher Booking Navigation

If connected to multiple teachers and the student taps the "Book" tab:
- Show a teacher selection screen listing connected teachers
- Each teacher card shows: name, profile photo, next available slot ("Next: Thu at 2 PM"), credit balance
- Tapping a teacher navigates to `/book/{teacherSlug}`

If connected to a single teacher, "Book" tab goes directly to `/book/{teacherSlug}`.

---

## Navigation

Bottom tab bar on all screen sizes (max 5 tabs, per `04_UI_Design_System.md`).

| Tab | Icon | Route | Badge |
|-----|------|-------|-------|
| Home | Home | `/home` | -- |
| Book | CalendarPlus | `/book` or teacher selector | -- |
| Practice | CheckSquare | `/practice` | Count of open tasks |
| Credits | CreditCard | `/credits` | Red dot if any balance is 0 |
| Settings | Settings | `/settings` | -- |

### Student Settings Sub-Pages

Accessible from `/settings`:
- Profile (name, email, phone)
- Calendar Sync (Google Calendar connection)
- Notifications (preference toggles)
- Account (delete account)

---

## Lesson History Page

Accessible from a "Lesson History" link on the Home tab (below the upcoming lessons list).

### Layout

Chronological list (newest first) of all past lessons. Filterable by teacher if connected to multiple.

| Column | Content |
|--------|---------|
| Date | Lesson date |
| Teacher | Teacher name (if multi-teacher) |
| Type | Lesson type |
| Status | Badge: completed, cancelled, no-show |
| Notes | Icon indicator if notes exist |

**Tap behavior**: opens lesson detail with full notes and practice tasks.

### Filtering

- **Teacher filter**: dropdown, "All Teachers" default (hidden if single teacher)
- **Status filter**: "All", "Completed", "Cancelled"
- No date range filter in MVP

---

## Real-Time Updates

The dashboard uses Firestore real-time listeners (`onSnapshot`) for:
- `lessons` where `studentId == currentUser` and `status == 'scheduled'` -- upcoming lessons
- `studentCredits` where `studentId == currentUser` -- credit balances
- `practiceItems` where `studentId == currentUser` and `completed == false` -- open task count

This ensures the dashboard reflects new bookings, cancellations, credit changes, and practice task assignments without manual refresh.

---

## Gaps & Assumptions

- **Assumption**: The dashboard loads data for all connected teachers in parallel. With a typical student having 1-3 teachers, this is a small number of concurrent queries.
- **Assumption**: The "Join" button for virtual lessons uses the static virtual link from the teacher's location. If the link is missing or invalid, show the location name without a link.
- **Assumption**: Practice task count badge on the "Practice" tab counts all tasks where `completed == false` across all teachers. This is a single Firestore query with a `studentId` filter.
- **Gap**: No search or text filtering on lesson history. Students must scroll to find past lessons. Search is post-MVP.
- **Gap**: No "suggested next booking" based on lesson frequency. The app does not prompt "You usually have a lesson every Tuesday -- book next week?" Intelligent booking suggestions are post-MVP.
- **Gap**: No offline support. The dashboard requires an internet connection. Offline caching of schedule and practice tasks via Firestore persistence is post-MVP.
- **Gap**: No calendar view for students. Students see a list-based schedule, not a calendar grid. A weekly calendar view option is post-MVP. See `18_Future_Features.md`.
- **Gap**: No student-to-student social features. Students cannot see other students of the same teacher. Community features are post-MVP.  
