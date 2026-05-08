▸ Extended thinking (1029 chars)  
# Teacher Onboarding

## Overview

A 3-screen setup wizard that runs immediately after a teacher registers. The wizard collects the minimum information needed to start inviting students and receiving bookings: profile basics, lesson types with pricing, and availability. Teachers cannot access the main app until the wizard is complete. Stripe Connect onboarding is not part of the wizard -- it is triggered separately when a teacher first creates a paid lesson type.

## Dependencies

- `01_Auth.md` -- Teacher registration flow, custom claims
- `02_Database_Schema.md` -- `teacherProfiles`, `lessonTypes`, `availability` collections
- `03_API_Endpoints.md` -- `updateTeacherProfile`, `completeSetupWizard`, `checkSlugAvailable`
- `04_UI_Design_System.md` -- Form patterns, button variants, card styling

## Entry Conditions

- Teacher has just completed registration (any auth provider)
- `teacherProfiles.setupComplete` is `false`
- If a teacher logs out mid-wizard and logs back in, they resume where they left off
- Wizard state is persisted to Firestore after each screen, not just at the end

## Wizard Structure

| Screen | Title | Purpose | Required to Proceed |
|--------|-------|---------|-------------------|
| 1 | Your Profile | Identity and public info | Display name, slug |
| 2 | Your Lessons | At least one lesson type | One lesson type with duration and price |
| 3 | Your Availability | Weekly schedule | At least one availability slot |

### Progress Indicator

- Horizontal step bar at the top: three labeled dots connected by a line
- Completed steps shown in `--accent-500`, current step has a filled dot, future steps in `--brand-200`
- Steps are labeled: "Profile", "Lessons", "Availability"
- Back button on screens 2 and 3 (no back on screen 1)

---

## Screen 1: Your Profile

### Fields

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| Display name | Text input | Yes | 2-50 chars | Pre-filled from auth provider if available |
| Profile slug | Text input with prefix | Yes | 3-40 chars, lowercase alphanumeric + hyphens | Shows live preview: `app.tunefolio.com/teacher/{slug}` |
| Studio name | Text input | No | Max 80 chars | |
| Instruments | Multi-select chips | No | Max 10 | Predefined list + "Other" with freetext |
| Bio | Textarea | No | Max 500 chars | Character counter shown |
| Profile photo | Image upload | No | Max 2MB, JPEG/PNG | Circular crop preview. Stored in Firebase Storage. |

### Slug behavior

- Auto-generated from display name on first load (lowercase, spaces to hyphens, strip special chars)
- Teacher can edit manually
- Live availability check with debounce (500ms) via `checkSlugAvailable`
- Show green check or red X inline
- Reserved slugs are rejected (see `03_API_Endpoints.md`)

### Instruments predefined list

Piano, Guitar, Voice, Violin, Viola, Cello, Bass, Drums, Flute, Clarinet, Saxophone, Trumpet, Trombone, Ukulele, Banjo, Mandolin, Harp, Organ, Composition, Music Theory, Other

### On "Next"

- Validate required fields
- Save to `teacherProfiles` doc (create if first save, update if resuming)
- Proceed to screen 2

---

## Screen 2: Your Lessons

### Initial State

Empty state card: "Add your first lesson type so students can book with you."

Single CTA: "Add Lesson Type" button opens an inline form (not a modal -- modals are disorienting for low-tech users).

### Lesson Type Form (inline, expandable)

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| Name | Text input | Yes | Max 60 chars | e.g., "30-Minute Piano Lesson" |
| Duration | Select dropdown | Yes | Predefined options | 15, 30, 45, 60, 90, 120 minutes |
| Price | Currency input | Yes | $0.00-$999.99 | Stored in cents. `$0` allowed for free lessons. |
| Credit cost | Number input | Yes | 1-10, default 1 | How many credits this lesson consumes |
| Format | Toggle | Yes | Default: 1-on-1 | "1-on-1" or "Group" |
| Location | Checkbox group | No | From profile locations | Only shown if locations were added on screen 1 |
| Description | Textarea | No | Max 200 chars | |

### Adding multiple types

- After saving the first type, it appears as a card in a list
- "Add Another" button below the list opens a new inline form
- Each saved type card shows: name, duration, price, with edit/delete icons
- No limit on lesson types, but the wizard only requires one

### Pricing note

If the teacher enters a price greater than $0 and has not connected Stripe, show an inline info banner: "You'll need to connect a payment account to collect payments. We'll prompt you after setup." This is not blocking -- they can proceed.

### On "Next"

- At least one lesson type must be saved
- If zero: show inline error "Add at least one lesson type to continue"
- Proceed to screen 3

---

## Screen 3: Your Availability

### Layout

A weekly grid showing Monday through Sunday, with time from 6:00 AM to 10:00 PM in 30-minute increments.

### Interaction

- Teacher clicks/taps a cell to toggle it as available
- Click and drag to select a range within a day
- Selected cells fill with `--accent-50` background and `--accent-500` left border
- Clicking a filled cell deselects it
- All times are displayed in the teacher's detected timezone (shown at the top with a "Change" link)

### Timezone

- Auto-detect from browser: `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Display timezone name at the top of the grid: "Times shown in Eastern Time (America/New_York)"
- "Change" link opens a searchable timezone select dropdown
- Timezone is saved to each `availability` doc

### Quick-fill options

Row of buttons above the grid for common patterns:
- "Weekday mornings (9-12)" -- fills Mon-Fri 9:00 AM to 12:00 PM
- "Weekday afternoons (1-5)" -- fills Mon-Fri 1:00 PM to 5:00 PM
- "Clear all" -- resets grid

Quick-fill buttons are additive (they add to existing selections). "Clear all" is the only destructive action.

### Minimum requirement

At least one 30-minute slot must be selected.

### On "Finish"

- Save all selected slots as `availability` docs with `recurring: true`
- Set `teacherProfiles.setupComplete` to `true` via `completeSetupWizard`
- Redirect to teacher dashboard with a welcome toast: "You're all set! Invite your first student to get started."

---

## Post-Wizard State

After the wizard completes, the teacher lands on their dashboard (see `16_Teacher_Dashboard.md`). The dashboard shows contextual prompts for recommended next actions:

| Prompt | Condition | CTA |
|--------|-----------|-----|
| "Invite your first student" | Zero `teacherStudents` docs | "Send Invite" |
| "Connect payments" | `stripeOnboarded` is `false` and has lesson types with price > $0 | "Set Up Payments" |
| "Add your locations" | `locations` array is empty | "Add Location" |

These prompts appear as dismissible cards at the top of the dashboard. They are not part of the wizard -- they are soft nudges.

---

## Resuming an Incomplete Wizard

- On login, check `teacherProfiles.setupComplete`
- If `false`, redirect to wizard
- Determine the furthest completed screen from persisted data:
  - `teacherProfiles` has `slug` set: screen 1 is complete
  - At least one `lessonTypes` doc exists: screen 2 is complete
  - At least one `availability` doc exists: screen 3 is complete (wizard should be marked complete)
- Resume at the first incomplete screen
- Previously entered data is pre-populated

---

## Gaps & Assumptions

- **Assumption**: Profile photo upload goes to Firebase Storage at path `profiles/{userId}/avatar.{ext}`. Resized to 256x256 on upload via a Firebase Extension or client-side before upload.
- **Assumption**: Lesson type location assignment is optional during the wizard. Teachers can associate lesson types with specific locations later from settings. During the wizard, if no locations exist on the profile, the location field is hidden.
- **Gap**: No "skip" option for the wizard. Every teacher must complete all three screens. If this proves too much friction, a "Skip for now" option could defer screens 2-3, but this risks teachers having incomplete profiles and not being able to receive bookings.
- **Gap**: Group lesson setup during the wizard only creates the lesson type definition. The actual `groupClasses` doc (with schedule, capacity, etc.) is created post-wizard from the Lessons management screen. See `10_Group_Lessons.md`.
- **Gap**: No onboarding tutorial or tooltips beyond the wizard itself. If teachers struggle, consider adding contextual help tooltips post-launch.
- **Assumption**: The 30-minute grid granularity matches the minimum lesson duration option (15 min would fit within a 30-min slot). If 15-minute precision is needed for availability, reduce grid granularity, but this increases visual complexity.  
