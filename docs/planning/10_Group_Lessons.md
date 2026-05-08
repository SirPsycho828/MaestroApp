# Group Lessons

## Overview

Teachers can create group classes alongside private 1-on-1 lessons. A group class is a recurring or one-off session where multiple students attend together. Students enroll in a group class and are automatically booked into upcoming sessions. Credits are deducted per session, not at enrollment. The MVP uses simple enrollment -- students sign up until the class is full. Waitlists, drop-in spots, and complex roster management are post-MVP.

## Dependencies

- `02_Database_Schema.md` -- `groupClasses`, `lessons`, `lessonTypes` collections
- `03_API_Endpoints.md` -- `createGroupClass`, `updateGroupClass`, `enrollInGroupClass`, `unenrollFromGroupClass`, `generateGroupSessions`
- `04_UI_Design_System.md` -- Card patterns, badge styles, capacity indicators
- `07_Availability_Management.md` -- Group class times are separate from availability slots
- `08_Lesson_Scheduling.md` -- Individual lesson docs per student per session
- `09_Lesson_Types_Locations.md` -- Group lesson types (`isGroup: true`)
- `11_Credit_System.md` -- Per-session credit deduction

---

## Concepts

### Group Class vs Group Lesson

- **Group class** (`groupClasses` doc): the definition -- "Beginner Guitar Ensemble, Tuesdays 4 PM, max 8 students"
- **Group lesson** (`lessons` doc): an individual session instance -- "Beginner Guitar Ensemble on Tuesday June 16, for student Alice"

One group class generates many lesson docs over time. Each enrolled student gets their own `lessons` doc per session for independent status tracking (attendance, notes, cancellation).

### Relationship to Lesson Types

Every group class references a `lessonType` where `isGroup: true`. The lesson type defines duration, price, and credit cost. The group class adds schedule, capacity, and roster.

---

## Teacher: Creating a Group Class

### Prerequisites

- At least one lesson type with `isGroup: true` must exist
- If none exist, the "Create Group Class" flow starts with creating the lesson type first (same form as `09_Lesson_Types_Locations.md`, with format pre-set to "Group")

### Access

"Group Classes" section on the `/lessons` page, or a dedicated `/group-classes` page linked from the sidebar.

### Form Fields

| Field | Required | Validation | Default | Notes |
|-------|----------|------------|---------|-------|
| Lesson type | Yes | Select from `isGroup: true` types | -- | Determines duration, price, credit cost |
| Class name | Yes | 2-80 chars | Lesson type name | e.g., "Beginner Guitar Ensemble" |
| Day of week | Yes | Select Mon-Sun | -- | |
| Start time | Yes | Time select, 15-min increments | -- | In teacher's timezone |
| Location | Yes | Select from active locations | -- | |
| Max capacity | Yes | 2-30 | 8 | |
| Recurring | Yes | Toggle | Yes | If no, this is a one-off class |

### On Create

1. Create `groupClasses` doc with `status: 'active'`
2. `generateGroupSessions` creates `lessons` docs for each enrolled student for the next 4 weeks (initially zero students, so no lesson docs yet)
3. Teacher sees the new class in their group classes list

---

## Teacher: Managing Group Classes

### Group Class List

Cards showing each group class with:

| Content | Source |
|---------|--------|
| Class name | `groupClasses.name` |
| Schedule | Day + time, formatted ("Tuesdays, 4:00 PM") |
| Location | Location name |
| Enrollment | "{current} / {max}" with a fill bar |
| Status badge | Active, Paused, Cancelled |

### Actions

**Edit**: Update name, capacity, location, or time. Time changes apply to future sessions only. Already-generated lesson docs for upcoming sessions are updated via Cloud Function.

**Pause**: Sets `status: 'paused'`. No new sessions are generated. Existing scheduled sessions remain. Students stay enrolled but are not booked into new sessions. Useful for summer breaks.

**Resume**: Sets `status: 'active'`. Session generation resumes on next scheduled run.

**Cancel class**: Sets `status: 'cancelled'`. All future scheduled sessions are cancelled. Credits returned for all cancelled sessions. Students are notified. Enrolled roster is preserved for records but students are effectively unenrolled.

### Roster View

Expanding a group class card shows the enrolled student list:

| Column | Content |
|--------|---------|
| Student name | Display name |
| Enrolled since | Date |
| Actions | Remove from class |

Removing a student: unenrolls them, cancels their future sessions in this class, returns credits for those cancelled sessions.

---

## Student: Discovering Group Classes

### Where Group Classes Appear

On the student booking page (`/book/{teacherSlug}`), group classes appear in a separate section below the 1-on-1 lesson types:

**Section heading**: "Group Classes"

**Group class card content**:
- Class name
- Schedule ("Tuesdays, 4:00 PM Eastern")
- Duration (from lesson type)
- Location
- Credit cost per session (from lesson type)
- Spots remaining: "{available} of {max} spots" with color coding
  - 3+ spots: `--success` text
  - 1-2 spots: `--warning` text
  - 0 spots: `--error` text, "Full" badge, enroll button disabled

---

## Student: Enrolling in a Group Class

### Flow

1. Student taps "Enroll" on a group class card
2. Confirmation screen:
   - Class name, schedule, location
   - Credit cost: "{X} credit(s) per session"
   - Note: "Credits are deducted before each session, not upfront."
   - Current credit balance displayed
3. Student confirms enrollment
4. `enrollInGroupClass` function:
   - Checks capacity (`enrolledStudentIds.length < maxCapacity`)
   - Adds student UID to `enrolledStudentIds` array
   - Creates `lessons` docs for this student for already-generated upcoming sessions
   - Deducts credits for the next upcoming session only (if it is within 7 days)
5. Success toast: "Enrolled in {class name}"
6. Teacher notified: "{Student name} enrolled in {class name}"

### No Credit Check at Enrollment

Enrollment itself does not require credits. Credits are deducted per session by the `generateGroupSessions` function. If a student has zero credits when a session is generated, the session is still created with `creditDeducted: false` and flagged for the teacher (same as manual booking override in `08_Lesson_Scheduling.md`).

---

## Student: Unenrolling

1. Student navigates to their enrolled group classes (shown on student dashboard or `/book/{teacherSlug}`)
2. Taps "Leave Class"
3. Confirmation: "Leave {class name}? Your credits for future sessions will be returned."
4. `unenrollFromGroupClass` function:
   - Removes student from `enrolledStudentIds`
   - Cancels all future `lessons` docs for this student in this class
   - Returns credits for cancelled sessions where `creditDeducted: true`
5. Teacher notified

---

## Session Generation

The `generateGroupSessions` scheduled function runs weekly (see `03_API_Endpoints.md`).

### Logic

1. Query all `groupClasses` with `status: 'active'` and `recurring: true`
2. For each class, determine session dates for the next 4 weeks
3. For each session date, check if `lessons` docs already exist (idempotent: skip if found by matching `groupClassId` + `scheduledAt`)
4. For each enrolled student, create a `lessons` doc:
   - `status: 'scheduled'`
   - `groupClassId` set
   - `teacherId`, `studentId`, `lessonTypeId`, `locationId` from the class definition
   - `scheduledAt` = next occurrence date + class start time, converted to UTC
   - `durationMinutes` from lesson type
5. Deduct credits from each student's balance for the session
6. Create `transactions` docs for each credit deduction
7. If a student has insufficient credits: create the lesson with `creditDeducted: false`, log a transaction with `type: 'credit_deduction'` and a flag

### One-Off Classes

For non-recurring group classes (`recurring: false`), the session is generated once at class creation time for the specified date. No scheduled function involvement.

---

## Session Cancellation (Single Session)

A teacher may need to cancel one session of a recurring class (e.g., holiday) without cancelling the whole class.

- Teacher opens the specific session from their schedule view
- Taps "Cancel Session"
- Confirmation: "Cancel this session for all enrolled students? Credits will be returned."
- All `lessons` docs for this `groupClassId` + `scheduledAt` are cancelled
- Credits returned for each student
- Students notified

This does not affect future recurring sessions.

---

## Attendance and Completion

After a group session's scheduled time:
- Teacher sees a "Complete Session" prompt on their dashboard
- Completing a group session shows a checklist of enrolled students
- Teacher marks each student as attended or no-show
- Attended: lesson status set to `completed`
- No-show: lesson status set to `no_show`, credit not returned
- Teacher can add per-student notes (see `13_Lesson_Workflow.md`)

---

## Gaps & Assumptions

- **Assumption**: Max capacity default of 8 with a hard limit of 30 is sufficient for music group lessons. Ensemble classes, group theory, or choir rehearsals rarely exceed 20.
- **Assumption**: Group class times are independent of the teacher's availability slots. A teacher does not need to mark a time as "available" to schedule a group class there. Group classes are manually scheduled and do not consume availability.
- **Assumption**: The 4-week lookahead for session generation is fixed. Teachers cannot see or manage sessions further than 4 weeks ahead.
- **Gap**: No waitlist. If a class is full, students must check back. Waitlist with auto-enrollment is post-MVP. See `18_Future_Features.md`.
- **Gap**: No drop-in model. All students must formally enroll. A "drop-in" option where students book individual group sessions without enrolling is post-MVP.
- **Gap**: No per-session capacity override. Every session of a recurring class has the same max capacity. A teacher who wants a different cap for one session must edit the class, then edit it back.
- **Gap**: No student-to-student visibility. Enrolled students cannot see who else is in the class. Roster visibility is post-MVP.
- **Gap**: No make-up policy for missed group sessions. If a student misses a session (no-show or cancelled), the credit is handled per standard rules. No automatic rebooking into a different session.  
