# Lesson Types & Locations

## Overview

Teachers define the lessons they offer (lesson types) and the places they teach (locations). A lesson type specifies duration, price, credit cost, and format (1-on-1 or group). Locations can be physical addresses or virtual meeting links. Lesson types are associated with one or more locations, controlling where students can book each type. Both are created during onboarding (see `05_Teacher_Onboarding.md`) and managed ongoing from the teacher settings.

## Dependencies

- `02_Database_Schema.md` -- `lessonTypes` collection, `teacherProfiles.locations` embedded array
- `03_API_Endpoints.md` -- `createLessonType`, `updateLessonType`, `toggleLessonTypeActive`, `updateLocations`
- `04_UI_Design_System.md` -- Card patterns, form patterns, toggle styles
- `08_Lesson_Scheduling.md` -- Students select a lesson type when booking
- `10_Group_Lessons.md` -- Group lesson types link to group class definitions
- `11_Credit_System.md` -- `creditCost` determines how many credits a booking consumes

---

## Locations

### Data Model

Locations are stored as an embedded array on `teacherProfiles` (see `02_Database_Schema.md`). Each location has a client-generated UUID, a name, a type, and optional address or virtual link.

### Location Types

| Type | Fields Used | Example |
|------|------------|---------|
| `in-person` | `name`, `address` | "Home Studio" at "123 Main St, Austin, TX" |
| `virtual` | `name`, `virtualLink` | "Zoom" with "https://zoom.us/j/123456" |

### Management Page (`/settings/locations`)

A list of location cards with add, edit, and deactivate actions.

**Location card content**:
- Name (bold)
- Type badge: "In-Person" or "Virtual"
- Address or virtual link (truncated, full on hover/tap)
- Active/inactive status toggle
- Edit and delete icons

**Add Location form** (inline, not modal):

| Field | Required | Validation | Notes |
|-------|----------|------------|-------|
| Name | Yes | 2-60 chars | e.g., "Home Studio", "Zoom", "Lincoln Elementary" |
| Type | Yes | Toggle | "In-Person" or "Virtual" |
| Address | If in-person | 5-200 chars | Free text, no geocoding in MVP |
| Virtual link | If virtual | Valid URL | Zoom, Google Meet, FaceTime link, etc. |

**Deactivating a location**:
- Sets `active: false` on the location object
- Deactivated locations are hidden from the student booking flow
- Existing lesson types referencing this location keep the reference but the location no longer appears as a bookable option
- Lessons already booked at this location are unaffected
- Teacher sees deactivated locations in a collapsed "Inactive" section

**Deleting a location**:
- Only allowed if no active lesson types reference it
- If referenced: show error "This location is used by {lesson type names}. Deactivate it instead, or update those lesson types first."

### Saving

`updateLocations` replaces the full `teacherProfiles.locations` array. Client sends the complete array on every save.

---

## Lesson Types

### Data Model

Stored in the `lessonTypes` collection. One document per lesson type per teacher (see `02_Database_Schema.md`).

### Management Page (`/settings/lesson-types`)

A list of lesson type cards with add, edit, and activate/deactivate actions.

**Lesson type card content**:
- Name (bold)
- Duration (e.g., "30 min")
- Price (e.g., "$50.00") with credit cost (e.g., "1 credit")
- Format badge: "1-on-1" or "Group"
- Location tags (names of allowed locations)
- Active/inactive toggle

### Creating a Lesson Type

**Form fields**:

| Field | Required | Validation | Default | Notes |
|-------|----------|------------|---------|-------|
| Name | Yes | 2-60 chars | -- | e.g., "30-Minute Piano", "Advanced Theory" |
| Description | No | Max 200 chars | -- | Shown to students during booking |
| Duration | Yes | Select from list | 30 | Options: 15, 30, 45, 60, 90, 120 minutes |
| Price | Yes | $0.00 - $999.99 | -- | Stored in cents. $0 allowed for free/comp lessons. |
| Credit cost | Yes | 1-10 | 1 | Whole numbers only |
| Format | Yes | Radio | 1-on-1 | "1-on-1" or "Group". Immutable after creation. |
| Locations | No | Checkboxes | All active | Which locations this type can be booked at |

### Editing a Lesson Type

All fields are editable except **Format** (1-on-1 vs Group). This is immutable because changing format after lessons have been booked would break data integrity -- a 1-on-1 lesson cannot retroactively become a group class.

**Price and credit cost changes**:
- Changes apply to future bookings only
- Existing booked lessons retain the price/credit cost at the time of booking (stored on the `lessons` doc, not looked up from `lessonTypes`)
- No notification to students about price changes

### Deactivating a Lesson Type

- Sets `active: false`
- Hidden from student booking flow
- Existing scheduled lessons with this type are unaffected
- Teacher sees deactivated types in a collapsed "Inactive" section
- Can be reactivated at any time

### Deleting a Lesson Type

Not supported. Deactivate instead. Deletion would break references from historical `lessons` docs.

---

## Lesson Type and Location Relationship

A lesson type's `allowedLocationIds` array controls where it can be booked.

### Scenarios

| `allowedLocationIds` | Booking Behavior |
|---------------------|------------------|
| Empty array or not set | Bookable at all active locations |
| Contains specific IDs | Bookable only at those locations |
| All referenced locations inactive | Lesson type is effectively unbookable (no available slots will compute) |

### Student Booking Experience

When a student selects a lesson type with multiple locations:
- The time slot picker shows a location filter dropdown above the slots
- Default: "All Locations" showing combined availability
- Selecting a specific location filters to slots at that location only
- Each slot card shows the location name

When a lesson type has only one location, the filter is hidden.

---

## Credit Cost Design

Credit cost is per lesson type, set by the teacher. This allows teachers to charge different credit amounts for different lesson durations or specialties.

**Common patterns**:

| Lesson Type | Duration | Price | Credit Cost | Rationale |
|------------|----------|-------|-------------|-----------|
| 30-Min Piano | 30 min | $40 | 1 | Standard lesson |
| 60-Min Piano | 60 min | $75 | 2 | Longer = more credits |
| 30-Min Theory | 30 min | $35 | 1 | Same credits, different price |
| Trial Lesson | 30 min | $0 | 0 | Free trial, no credits |

A credit cost of `0` allows free lessons without touching the student's credit balance.

### How Credits Map to Subscriptions and Packs

The credit cost on a lesson type is independent of the subscription or credit pack that granted the credits. A subscription that provides 4 credits/month works with any lesson type:
- Four 1-credit lessons, or
- Two 2-credit lessons, or
- Any combination that totals 4 credits

This is intentionally flexible. See `11_Credit_System.md` for full credit lifecycle.

---

## Stripe Dependency

Lesson types with `priceAmount > 0` require the teacher to have completed Stripe onboarding (see `12_Stripe_Payments.md`).

- **Creating a paid lesson type before Stripe setup**: allowed. The lesson type is saved but students cannot purchase credits or subscriptions until Stripe is connected. The teacher sees a persistent prompt: "Connect payments to start receiving bookings."
- **Creating a free lesson type ($0)**: always allowed, no Stripe dependency. Students with credits (even 0-cost credits) can book freely.

---

## Gaps & Assumptions

- **Assumption**: Lesson type prices are displayed to students as informational context during booking, but students do not pay per-lesson at booking time. They use pre-purchased credits. The price on the lesson type serves as the basis for subscription and credit pack pricing, and appears on the teacher's public profile.
- **Assumption**: No per-student pricing. A lesson type has one price for all students. Custom pricing per student is post-MVP.
- **Assumption**: 15-minute lesson duration is included in the options even though availability granularity is 30 minutes. A 15-minute lesson consumes a 30-minute availability window, leaving a 15-minute gap. Teachers using 15-minute lessons should be aware of this inefficiency.
- **Gap**: No lesson type categories or tags. Teachers with many types rely on naming conventions. Categories (e.g., "Piano", "Theory") are post-MVP.
- **Gap**: No sorting or reordering of lesson types in the student booking view. They display in creation order. Drag-to-reorder is post-MVP.
- **Gap**: No virtual meeting link auto-generation (e.g., creating a Zoom link per lesson). The virtual link on a location is static. Teachers must manage their own meeting links.
- **Gap**: Address field is free text with no validation or geocoding. No map display. Structured addresses are post-MVP.  
