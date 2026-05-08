# Lesson Workflow

## Overview

A lesson in TuneFolio moves through a defined lifecycle: scheduled, in-progress (implicit, not a stored status), and then completed, cancelled, or no-show. After a lesson is completed, the teacher is prompted to record notes and assign practice tasks. Students see these notes and track their practice progress through a checklist. This file covers the post-booking lesson lifecycle -- booking and cancellation flows are in `08_Lesson_Scheduling.md`.

## Dependencies

- `02_Database_Schema.md` -- `lessons`, `practiceItems` collections
- `03_API_Endpoints.md` -- `completeLesson`, `markNoShow`, `saveLessonNotes`, `savePracticeItems`, `togglePracticeItem`, `getStudentPracticeItems`
- `04_UI_Design_System.md` -- Card patterns, form patterns, badge styles
- `08_Lesson_Scheduling.md` -- Lesson statuses and cancellation
- `10_Group_Lessons.md` -- Group session completion with per-student attendance
- `15_Notifications.md` -- Practice task notifications

---

## Lesson Lifecycle (Post-Booking)

```
                  ┌──────────────┐
                  │  scheduled   │
                  └──────┬───────┘
                         │
              lesson time arrives
                         │
                  ┌──────▼───────┐
                  │  (in lesson)  │  ← not a stored status
                  └──────┬───────┘
                         │
            ┌────────────┼────────────┐
            │            │            │
     ┌──────▼──────┐ ┌──▼─────┐ ┌───▼──────┐
     │  completed  │ │no_show │ │cancelled │
     └──────┬──────┘ └────────┘ └──────────┘
            │
     ┌──────▼──────┐
     │ notes &     │
     │ practice    │
     │ tasks       │
     └─────────────┘
```

---

## Teacher: Post-Lesson Prompt

After a lesson's scheduled end time passes, the teacher receives a prompt to record the outcome.

### Where It Appears

1. **Dashboard card** -- A "Lessons to review" section appears at the top of the teacher dashboard listing lessons whose `scheduledAt + durationMinutes` is in the past and status is still `scheduled`. See `16_Teacher_Dashboard.md`.
2. **Push notification** -- Sent 15 minutes after the lesson's end time: "How did your lesson with {student name} go? Tap to add notes." See `15_Notifications.md`.

### Prompt Card Content

| Element | Content |
|---------|---------|
| Student name | From `users.displayName` |
| Lesson type | From `lessonTypes.name` |
| Time | "{date} at {time}" |
| Actions | "Complete", "No-Show" |

Tapping "Complete" opens the lesson detail with the notes and practice task form. Tapping "No-Show" shows a confirmation dialog, then marks the lesson (see `08_Lesson_Scheduling.md` for credit handling).

### Stale Lessons

Lessons more than 7 days past their scheduled time and still in `scheduled` status are highlighted with a warning badge: "7+ days ago". No auto-completion -- the teacher must explicitly act. Indefinitely stale lessons are acceptable in MVP; an auto-complete policy is post-MVP.

---

## Teacher: Recording Notes

### Access

- From the post-lesson prompt card (primary path)
- From any completed lesson in the schedule view
- From the student profile's lesson history

### Notes Form

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| Lesson notes | Textarea | Max 2000 chars | Markdown not supported in MVP. Plain text. |

- Auto-saved on blur or after 3 seconds of inactivity (debounced)
- No explicit "Save" button for notes -- auto-save with a subtle "Saved" indicator
- Teacher can edit notes on a completed lesson at any time (no lock period)

### What Students See

Students see the teacher's notes on the lesson detail page (read-only). Notes appear under a "Teacher's Notes" heading. If no notes were written, the section is hidden, not shown empty.

---

## Teacher: Assigning Practice Tasks

### Access

Same entry points as notes -- the practice task form appears below the notes field on the lesson detail page.

### Practice Task Form

A simple checklist builder:

- Text input with an "Add" button (or Enter key) to append items
- Each item appears as a draggable row with:
  - Drag handle (for reordering)
  - Task text (editable inline)
  - Delete button (X icon)
- "Save Practice Tasks" button at the bottom

### Task Fields

| Field | Value |
|-------|-------|
| `description` | The task text, e.g., "Scales in C major at 80bpm" |
| `sortOrder` | Position in the list (0-indexed) |
| `completed` | `false` (always false on creation) |

### On Save

1. Client calls `savePracticeItems` with the lesson ID and array of task descriptions + sort orders
2. Function creates `practiceItems` docs for new items, updates changed items, deletes removed items
3. Student receives a push notification: "{Teacher name} assigned practice tasks from your {lesson type} lesson" (see `15_Notifications.md`)

### Editing After Save

Teachers can return to a completed lesson and modify practice tasks at any time:
- Add new items
- Edit existing item text
- Reorder items
- Delete items (even if the student has marked them complete)

Deleted items are hard-deleted from Firestore (no soft delete for practice items).

---

## Student: Viewing Lesson Details

### Lesson Detail Page

Accessed by tapping a lesson in the student's schedule or lesson history.

**Completed lesson detail**:

| Section | Content |
|---------|---------|
| Header | Lesson type, teacher name, date/time, location |
| Status | "Completed" badge |
| Teacher's Notes | Plain text notes (hidden if none) |
| Practice Tasks | Checklist (see below) |

**Scheduled lesson detail**:

| Section | Content |
|---------|---------|
| Header | Same as above |
| Status | "Scheduled" badge |
| Cancellation info | "Free cancellation until {deadline}" or "Late cancellation" warning |
| Actions | "Cancel Lesson", "Reschedule" |

---

## Student: Practice Task Checklist

### Where Tasks Appear

1. **Lesson detail page** -- Tasks for that specific lesson
2. **Practice dashboard** (`/practice`) -- All open tasks across all lessons and teachers

### Practice Dashboard Layout

Grouped by teacher, then sorted by lesson date (most recent first).

```
Teacher: Sarah Johnson
  └─ Piano Lesson - Jun 10
       ☐ Scales in C major at 80bpm
       ☐ Hanon exercises #1-5
       ☑ Review Fur Elise measures 1-16
  └─ Piano Lesson - Jun 3
       ☐ Sight-read one new piece
       ☑ Practice pedaling on Moonlight Sonata

Teacher: Mike Chen
  └─ Guitar Lesson - Jun 8
       ☐ Barre chord transitions: F-Bm-G
```

### Toggling Completion

- Student taps a checkbox to mark a task complete or incomplete
- Client calls `togglePracticeItem` with the item ID and new `completed` state
- If marking complete: set `completedAt` to current timestamp
- If unmarking: clear `completedAt`
- No confirmation dialog -- instant toggle
- Visual: completed items show strikethrough text and move to bottom of their lesson group

### Progress Indicator

Each lesson's task group shows a progress summary: "2 of 4 complete". A progress bar (thin, using `--accent-500`) fills proportionally beneath the lesson heading.

### Filtering

Top of the practice dashboard:
- **Toggle**: "Show completed" (default: off, hides fully completed lesson groups)
- No other filters in MVP

---

## Group Lesson Notes and Tasks

For group lessons, the teacher completes a per-student flow after marking attendance (see `10_Group_Lessons.md`):

- After marking the session complete with attendance, the teacher can optionally add:
  - **Shared notes**: Written once, visible to all attendees. Stored on the `lessons` doc for each attending student (duplicated per student doc for simplicity).
  - **Per-student tasks**: The teacher cycles through each attending student and can add individual practice items.
- The per-student task flow shows one student at a time with "Next Student" / "Previous Student" navigation and a "Done" button to finish.
- This flow is optional. The teacher can skip it entirely and just mark attendance.

---

## Lesson History

### Teacher View

Accessible from the student profile page. A chronological list (newest first) of all lessons with this student.

| Column | Content |
|--------|---------|
| Date | Lesson date |
| Type | Lesson type name |
| Status | Badge (completed, cancelled, no-show) |
| Notes | Truncated preview, or "--" if none |
| Tasks | "{X} tasks" or "--" |

Tapping a row opens the lesson detail with full notes and practice tasks.

### Student View

Accessible from "Lesson History" on the student dashboard. Same structure as teacher view but scoped to the student's own lessons. Filterable by teacher if connected to multiple teachers.

---

## Gaps & Assumptions

- **Assumption**: Notes are plain text only. No rich text, no images, no file attachments. Markdown or rich text editing is post-MVP.
- **Assumption**: Practice tasks are text-only checklist items. No due dates, no priority levels, no categories. Richer task features (file attachments, audio/video recordings of practice) are post-MVP.
- **Assumption**: Auto-save for notes uses a simple debounced write to Firestore. No offline queue or conflict resolution. If two tabs are open, last write wins.
- **Gap**: No practice task reminders. Students receive a notification when tasks are assigned but no follow-up reminders ("You have 3 incomplete tasks"). Reminders are post-MVP. See `18_Future_Features.md`.
- **Gap**: No teacher visibility into practice task completion. Teachers cannot see which tasks a student has checked off. A "student progress" view for teachers is post-MVP.
- **Gap**: No way to copy practice tasks from a previous lesson. Teachers must re-type recurring assignments. A "copy from last lesson" feature is post-MVP.
- **Gap**: Shared notes for group lessons are duplicated across each student's `lessons` doc. If the teacher edits shared notes after saving, the edit must update all student docs for that session. This is handled by the `saveLessonNotes` function iterating over all `lessons` docs matching the `groupClassId` + `scheduledAt`.  
