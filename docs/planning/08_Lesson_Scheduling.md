▸ Extended thinking (1353 chars)  
# Lesson Scheduling

## Overview

Students book 1-on-1 lessons by selecting from a teacher's computed available slots. Credits are deducted immediately at booking time -- no credits means no booking. Teachers can also manually book lessons on behalf of students. Both parties can cancel, subject to the teacher's configurable cancellation policy. Rescheduling is handled as a cancel-and-rebook flow. Group lesson scheduling is covered in `10_Group_Lessons.md`.

## Dependencies

- `02_Database_Schema.md` -- `lessons`, `studentCredits`, `transactions` collections
- `03_API_Endpoints.md` -- `bookLesson`, `cancelLesson`, `completeLesson`, `markNoShow`
- `04_UI_Design_System.md` -- Calendar view, badge styles, card patterns
- `07_Availability_Management.md` -- Slot computation logic, timezone handling
- `09_Lesson_Types_Locations.md` -- Lesson type definitions, credit costs
- `11_Credit_System.md` -- Credit deduction and return logic
- `15_Notifications.md` -- Booking and cancellation notifications

---

## Student Booking Flow

### Entry Point

Student navigates to `/book/{teacherSlug}`. If connected to only one teacher, a "Book Lesson" button on the student dashboard links directly.

### Step 1: Choose Lesson Type

Display the teacher's active lesson types as selectable cards.

| Card Content | Source |
|-------------|--------|
| Name | `lessonTypes.name` |
| Duration | `lessonTypes.durationMinutes` formatted ("30 min", "1 hr") |
| Price | `lessonTypes.priceAmount` formatted ("$50.00") |
| Credit cost | `lessonTypes.creditCost` ("1 credit", "2 credits") |

Only show lesson types where `isGroup: false` and `active: true`. Group classes have a separate enrollment flow (see `10_Group_Lessons.md`).

### Step 2: Choose Date and Time

After selecting a lesson type, show a date-based slot picker.

**Layout**: Calendar month strip at the top (horizontally scrollable, showing next 30 days). Below it, available time slots for the selected date as a vertical list of tappable cards.

**Slot display**: Each slot card shows:
- Start time in the student's local timezone
- End time derived from start + lesson type duration
- Location name (if the teacher has multiple locations, show a location filter above the slot list)

**Slot computation**: Client calls `getAvailableSlots` for the selected teacher and date range. Slots are returned in 30-minute windows (see `07_Availability_Management.md`). The client filters for start times where enough consecutive windows exist to fit the lesson type's duration.

**Empty dates**: Days with no available slots show "No times available" and are visually dimmed in the calendar strip.

### Step 3: Confirm Booking

Confirmation screen showing:

| Field | Value |
|-------|-------|
| Lesson | Lesson type name |
| Date | "Thursday, June 12, 2026" |
| Time | "3:00 PM - 3:30 PM (Eastern Time)" |
| Location | Location name |
| Credit cost | "1 credit" |
| Remaining after booking | "3 credits" (calculated: current balance minus cost) |

Primary CTA: "Confirm Booking"

### On Confirm

Client calls `bookLesson`. The function performs the steps in `03_API_Endpoints.md`. On success:
- Student sees success toast: "Lesson booked"
- Redirect to student dashboard
- Teacher receives push/email notification (see `15_Notifications.md`)
- Google Calendar event created if sync is enabled (see `14_Google_Calendar_Sync.md`)

### Insufficient Credits

If `studentCredits.balance < lessonType.creditCost`, the booking flow is blocked at step 3:
- Show current balance with a warning badge
- Replace the confirm button with: "You need {X} more credits to book this lesson"
- CTA: "Buy Credits" linking to the credit purchase flow (see `11_Credit_System.md`)

---

## Teacher Manual Booking

Teachers can book lessons on behalf of students from the teacher dashboard or schedule view.

### Flow

1. Teacher clicks "Add Lesson" from schedule view or student profile
2. Selects student (dropdown of active students)
3. Selects lesson type
4. Selects date/time (from their own availability grid, with booked slots shown)
5. Confirms booking

### Credit Handling for Manual Bookings

- If the student has sufficient credits: deducted as normal
- If the student has insufficient credits: teacher sees a warning but can override. The lesson is created with `creditDeducted: false`. The teacher is accepting the credit gap.
- Lessons with `creditDeducted: false` are flagged on the teacher dashboard for manual resolution

---

## Cancellation Policy

### Configuration

Teachers set `cancellationWindowHours` on their profile (see `02_Database_Schema.md`). Default: 24 hours. Configurable from teacher settings.

| Setting | Type | Range | Default |
|---------|------|-------|---------|
| `cancellationWindowHours` | number | 0-168 (0 = no policy, 168 = 1 week) | 24 |

Setting to `0` means cancellations always return credits regardless of timing.

### Rules

| Who Cancels | Timing | Credit Outcome |
|-------------|--------|----------------|
| Student | Before window (e.g., 25+ hrs ahead) | Credit returned |
| Student | Within window (e.g., <24 hrs ahead) | Credit forfeited |
| Teacher | Any time | Credit always returned |
| System | Any time | Credit always returned |

### Visibility

When a student views a booked lesson, show the cancellation deadline: "Free cancellation until {date/time}". After the deadline passes, show: "Late cancellation -- credit will not be returned."

---

## Cancellation Flow

### Student Cancels

1. Student taps "Cancel Lesson" on a scheduled lesson
2. If before cancellation window:
   - Confirmation dialog: "Cancel this lesson? Your credit will be returned."
   - On confirm: credit returned, lesson status set to `cancelled_by_student`
3. If within cancellation window:
   - Confirmation dialog: "Cancel this lesson? This is a late cancellation -- your credit will not be returned."
   - On confirm: credit forfeited, lesson status set to `cancelled_by_student`
4. Notification sent to teacher
5. Google Calendar event removed if synced

### Teacher Cancels

1. Teacher taps "Cancel Lesson" on a scheduled lesson
2. Confirmation dialog: "Cancel this lesson? The student's credit will be returned."
3. On confirm: credit always returned, lesson status set to `cancelled_by_teacher`
4. Notification sent to student
5. Google Calendar event removed

---

## Rescheduling

No dedicated reschedule function. Rescheduling is cancel + rebook:

1. Cancel the existing lesson (credit returned per cancellation rules)
2. Book a new lesson at the desired time (credit deducted again)

The UI can streamline this. On a scheduled lesson detail, show a "Reschedule" button alongside "Cancel". Tapping "Reschedule":
1. Cancels the current lesson (always returns credit, regardless of window, since the student is rebooking, not abandoning)
2. Redirects to the booking flow (step 2: date/time selection) with the same lesson type pre-selected
3. If the student abandons the rebooking flow, the original cancellation still stands and credit has been returned

---

## Lesson Status Lifecycle

```
scheduled ──> completed       (teacher marks complete)
scheduled ──> cancelled_by_student
scheduled ──> cancelled_by_teacher
scheduled ──> no_show         (teacher marks no-show)
```

All transitions are one-way. No status can revert to `scheduled`.

### Completion

- Teacher marks a lesson as completed from the schedule view or via the post-lesson prompt (see `13_Lesson_Workflow.md`)
- Lessons are not auto-completed. The teacher must explicitly mark them.
- Uncompleted lessons past their scheduled time show a "Mark Complete" prompt on the teacher dashboard

### No-Show

- Teacher marks student as no-show from the schedule view
- Credit is not returned (treated like a late cancellation)
- Tracked for the teacher's attendance analytics (see `16_Teacher_Dashboard.md`)

---

## Schedule Views

### Teacher Schedule

See `16_Teacher_Dashboard.md` for full dashboard spec. The schedule component shows:
- Weekly calendar view (default) with day and month toggles
- Lessons as cards on the time grid with student name, lesson type, and location
- Color-coded by status using badge colors from `04_UI_Design_System.md`
- Clicking a lesson opens a detail panel with actions (complete, cancel, no-show, add notes)

### Student Schedule

See `17_Student_Dashboard.md`. Shows upcoming lessons as a chronological list with:
- Date, time (in student's timezone), teacher name, lesson type, location
- "Cancel" button with policy-aware confirmation
- "Reschedule" button

---

## Gaps & Assumptions

- **Assumption**: Rescheduling always returns the credit from the original lesson, even within the cancellation window. This prevents punishing students for trying to find a better time rather than outright cancelling. Teachers who want strict no-reschedule policies can set `cancellationWindowHours` high, but the reschedule bypass is intentional.
- **Assumption**: Double-booking prevention is handled atomically in the `bookLesson` function using a Firestore transaction that checks for existing `scheduled` lessons overlapping the requested time before creating the new one.
- **Gap**: No waitlist for fully-booked time slots. If a student wants a slot that is taken, they must check back later or choose another time.
- **Gap**: No recurring lesson booking (e.g., "book every Tuesday at 3 PM"). Students book individual sessions. Recurring bookings are post-MVP -- see `18_Future_Features.md`.
- **Gap**: No buffer time between lessons. A teacher available 3-6 PM with 30-minute lessons gets six back-to-back slots with no breaks. Teachers must build in breaks by leaving gaps in their availability.
- **Assumption**: `markNoShow` is only available after the lesson's scheduled time has passed. The function validates `scheduledAt + durationMinutes < now`.
- **Gap**: No student-initiated no-show dispute. If a student disagrees with a no-show mark, they must contact the teacher outside the app. Dispute resolution is post-MVP.  
