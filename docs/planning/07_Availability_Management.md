# Availability Management

## Overview

Teachers define their bookable hours through a weekly recurring schedule with date-specific overrides. Availability is managed exclusively inside TuneFolio -- Google Calendar events do not affect availability (one-way sync only, see `14_Google_Calendar_Sync.md`). Students see computed available slots that account for recurring patterns, overrides, blocks, and existing bookings.

## Dependencies

- `02_Database_Schema.md` -- `availability`, `lessons` collections
- `03_API_Endpoints.md` -- `setAvailability`, `getAvailableSlots`, `blockTime`
- `04_UI_Design_System.md` -- Calendar grid styling, blocked time hatching
- `05_Teacher_Onboarding.md` -- Initial availability set during wizard (screen 3)
- `08_Lesson_Scheduling.md` -- Booking consumes available slots

---

## Concepts

### Recurring Slots

Weekly patterns that repeat every week indefinitely. A recurring slot says "I teach every Tuesday from 3:00 PM to 6:00 PM." Stored as `availability` docs with `recurring: true` and a `dayOfWeek` value.

### Date-Specific Overrides

One-time additions or replacements for a specific date. "This Saturday I'm available 10:00 AM to 2:00 PM." Stored with `recurring: false` and a `specificDate` value.

### Blocks

Time-off markers that remove availability on a specific date. "I'm unavailable this Thursday afternoon." Stored with `blocked: true` and a `specificDate`. Blocks take precedence over recurring slots.

### Computed Available Slots

What students actually see when booking. Generated on the fly by the `getAvailableSlots` function by layering:

```
Recurring slots for the date's day of week
  + Date-specific additions
  - Blocks for that date
  - Already-booked lessons on that date
  = Available slots
```

---

## Teacher: Managing Availability

### Page Layout (`/availability`)

Two sections, stacked vertically:

1. **Weekly Schedule** -- The recurring pattern (top)
2. **Upcoming Overrides** -- Date-specific additions and blocks (bottom)

### Weekly Schedule View

A grid identical to the one in the onboarding wizard (see `05_Teacher_Onboarding.md`):

- Columns: Monday through Sunday
- Rows: 30-minute increments from 6:00 AM to 10:00 PM
- Filled cells = available (recurring)
- Click/drag to toggle cells
- Timezone displayed at top with "Change" link

**Saving**: Changes are saved when the teacher clicks "Save Schedule". No auto-save -- teachers may want to make multiple adjustments before committing. Show a dirty-state indicator ("Unsaved changes") and a "Discard" option alongside "Save Schedule".

**What happens on save**: The `setAvailability` function receives the full weekly grid state and replaces all `recurring: true` docs for this teacher. This is a full replacement, not a diff -- simpler logic, avoids orphaned slots.

### Upcoming Overrides Section

A chronological list of date-specific overrides and blocks for the next 60 days.

| Column | Content |
|--------|---------|
| Date | "Thu, Jun 12" |
| Time | "10:00 AM - 2:00 PM" or "All day" for full-day blocks |
| Type | "Available" badge (green) or "Blocked" badge (gray) |
| Actions | Edit, Delete |

**Add Override button** opens an inline form:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Date | Date picker | Yes | Must be today or future |
| Type | Toggle | Yes | "Available" or "Blocked" |
| Start time | Time select | Yes | 15-min increments |
| End time | Time select | Yes | Must be after start time |
| Applies to | Select | If blocked | "This time only" or "Entire day" |

When "Entire day" block is selected, start/end time fields are hidden. A full-day block cancels all recurring availability for that date.

---

## Slot Computation Logic

The `getAvailableSlots` function (see `03_API_Endpoints.md`) computes bookable slots for a given teacher and date range.

### Input

- `teacherId`: string
- `startDate`: date (inclusive)
- `endDate`: date (inclusive, max 30 days from startDate)

### Algorithm

For each date in the range:

1. **Get base slots**: query `availability` where `teacherId` matches, `recurring: true`, and `dayOfWeek` equals the date's day of week
2. **Add overrides**: query `availability` where `teacherId` matches, `recurring: false`, `blocked: false`, and `specificDate` equals the date
3. **Merge**: combine recurring and override slots into a unified list of available windows
4. **Subtract blocks**: query `availability` where `teacherId` matches, `blocked: true`, and `specificDate` equals the date. Remove blocked time ranges from available windows. Full-day blocks remove everything.
5. **Subtract booked lessons**: query `lessons` where `teacherId` matches, `status: 'scheduled'`, and `scheduledAt` falls within the date. Remove the booked time ranges (using each lesson's `scheduledAt` + `durationMinutes`).
6. **Split into bookable slots**: divide remaining available windows into discrete slots based on the lesson durations the teacher offers. A 90-minute available window can fit one 60-minute slot or one 30-minute slot, etc.

### Output

```
{
  "slots": [
    {
      "date": "2026-06-12",
      "windows": [
        { "start": "09:00", "end": "09:30", "locationIds": ["loc1"] },
        { "start": "09:30", "end": "10:00", "locationIds": ["loc1"] },
        { "start": "14:00", "end": "14:30", "locationIds": ["loc1", "loc2"] }
      ]
    }
  ],
  "timezone": "America/New_York"
}
```

Windows are returned in 30-minute granularity. The student's booking UI combines adjacent windows as needed to fit the selected lesson type's duration.

### Location Filtering

- Recurring slots can optionally have a `locationId`
- If set, the slot is only available at that location
- If null, the slot is available at all of the teacher's locations
- The output includes `locationIds` per window so the student booking UI can filter by location

---

## Timezone Handling

- All `availability` docs store the IANA `timezone` value
- `startTime` and `endTime` are stored as naive local time strings ("HH:mm") in the teacher's timezone
- The `getAvailableSlots` function converts to UTC internally for comparison with `lessons.scheduledAt` (which is a UTC Firestore Timestamp)
- Students see slots displayed in their own browser's timezone
- DST transitions: when computing slots for dates near a DST change, use the timezone offset for the specific date, not the current offset

---

## Edge Cases

### Overlapping slots

If a recurring slot (Tue 3-6 PM) and a date-specific override (this Tue 4-7 PM) overlap, merge them into a single 3-7 PM window. Do not show duplicates.

### Block partially overlapping a recurring slot

Recurring: Tue 3-6 PM. Block: this Tue 4-5 PM. Result: two windows, 3-4 PM and 5-6 PM.

### No availability

If a date has no available slots after computation, omit it from the response. The student booking UI shows "No available times" for that date.

### Booking that spans a slot boundary

A lesson type of 60 minutes requires two adjacent 30-minute windows. The `getAvailableSlots` output returns raw 30-minute windows; the student booking UI is responsible for identifying valid start times where enough consecutive windows exist.

### Past dates

`getAvailableSlots` never returns slots for dates in the past, even if `startDate` is in the past. Filter to today or later.

---

## Interaction with Lesson Scheduling

When a lesson is booked (see `08_Lesson_Scheduling.md`):
- The slot is consumed -- it will no longer appear in `getAvailableSlots` output
- No change is made to `availability` docs. Booked lessons are subtracted at computation time.

When a lesson is cancelled:
- The slot becomes available again automatically (the cancelled lesson is no longer in `scheduled` status, so it is not subtracted)

---

## Gaps & Assumptions

- **Assumption**: 30-minute granularity is the smallest bookable unit. The grid and computation logic use 30-minute increments. 15-minute lessons would fit within a 30-minute slot (the remaining 15 minutes would appear as a gap too short for another 30-minute lesson but could fit another 15-minute one). This edge case is acceptable for MVP.
- **Assumption**: Full replacement of recurring slots on save is acceptable. If a teacher has 50+ recurring slots, this means deleting and recreating up to 50 docs per save. Firestore batch writes handle this efficiently (max 500 ops per batch).
- **Gap**: No recurring block patterns (e.g., "block every Monday"). Blocks are always date-specific. Teachers needing a recurring day off should remove that day from their weekly schedule instead.
- **Gap**: No "copy last week's overrides" feature. Each week's overrides are set manually.
- **Gap**: No bulk block for date ranges (e.g., "block Jun 15-22 for vacation"). Teachers must add individual date blocks. A date-range block feature is a natural post-MVP addition. See `18_Future_Features.md`.
- **Gap**: No notification to students when a teacher removes availability that overlaps with a not-yet-booked window. Since no booking exists, no student is affected -- they simply see fewer available slots.
- **Assumption**: The 60-day lookahead for the overrides list is a UI constraint only. The database accepts overrides for any future date.  
