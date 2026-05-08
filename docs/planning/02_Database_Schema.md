▸ Extended thinking (4488 chars)  
# Database Schema

## Overview

Firestore collections for TuneFolio. All documents include `createdAt` and `updatedAt` timestamps unless noted otherwise. Document IDs are auto-generated unless specified. Monetary values are stored in cents (integer) to avoid floating-point issues.

## Dependencies

- `01_Auth.md` -- Role definitions, custom claims, security rules context
- `03_API_Endpoints.md` -- Which endpoints read/write which collections
- `11_Credit_System.md` -- Credit lifecycle and rollover logic
- `12_Stripe_Payments.md` -- Stripe object ID references

## Conventions

- All timestamps are Firestore `Timestamp` type
- All monetary fields use `number` in cents (e.g., `2500` = $25.00)
- Fields marked **indexed** require a single-field index beyond Firestore's automatic indexes
- Composite indexes are listed per collection where needed
- Soft deletes use a `deletedAt` timestamp; queries must filter `where deletedAt == null`

---

## Collections

### `users`

**Purpose**: Core identity for all authenticated users. Minimal PII -- extended profile data lives in `teacherProfiles`.

**Document ID**: Firebase Auth UID

| Field | Type | Notes |
|-------|------|-------|
| email | string | From auth provider. May be Apple relay address. |
| displayName | string | |
| role | string | `'teacher'` or `'student'`. Immutable after creation. |
| avatarUrl | string? | |
| phone | string? | Optional, student-provided |
| tosAcceptedAt | Timestamp | Required at registration |
| deletedAt | Timestamp? | Soft delete -- PII cleared when set |

---

### `teacherProfiles`

**Purpose**: Public and operational teacher data. One per teacher.

**Document ID**: Firebase Auth UID (same as `users` doc ID)

| Field | Type | Notes |
|-------|------|-------|
| slug | string | URL-safe, unique. Used in `/teacher/{slug}`. |
| bio | string? | Public profile |
| instruments | string[] | e.g., `['piano', 'voice']` |
| studioName | string? | |
| locations | Location[] | Embedded array (see shape below) |
| stripeAccountId | string? | Stripe Connect account ID |
| stripeOnboarded | boolean | `false` until Stripe onboarding completes |
| setupComplete | boolean | `true` after wizard finishes |
| cancellationWindowHours | number | Default: `24`. See `08_Lesson_Scheduling.md`. |
| creditRolloverCapMonths | number | Default: `2`. See `11_Credit_System.md`. |

**Location shape** (embedded in `locations` array):

| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID, generated client-side |
| name | string | e.g., "Home Studio", "Zoom" |
| type | string | `'in-person'` or `'virtual'` |
| address | string? | For in-person |
| virtualLink | string? | For virtual (Zoom URL, etc.) |
| active | boolean | |

**Composite indexes**:
- `slug` ASC (unique constraint enforced by Cloud Function on create/update)

---

### `invites`

**Purpose**: Teacher-generated invite tokens for student onboarding. See `06_Student_Invitation.md`.

| Field | Type | Notes |
|-------|------|-------|
| teacherId | string | |
| studentName | string | Pre-filled by teacher |
| studentEmail | string | Used for pre-fill, not for matching auth |
| token | string | Unique, URL-safe. Indexed. |
| status | string | `'pending'`, `'accepted'`, `'expired'` |
| expiresAt | Timestamp | Default: 30 days from creation |
| acceptedBy | string? | Student's UID after acceptance |

**Composite indexes**:
- `token` ASC (unique query)
- `teacherId` ASC, `status` ASC, `createdAt` DESC (teacher's invite list)

---

### `teacherStudents`

**Purpose**: Many-to-many relationship. A student can have multiple teachers; a teacher has multiple students.

| Field | Type | Notes |
|-------|------|-------|
| teacherId | string | |
| studentId | string | |
| status | string | `'active'`, `'inactive'` |
| studentDisplayName | string | Denormalized for teacher's roster view |

**Composite indexes**:
- `teacherId` ASC, `status` ASC (teacher's active roster)
- `studentId` ASC, `status` ASC (student's active teachers)

---

### `lessonTypes`

**Purpose**: Template definitions for bookable lessons. Each teacher defines their own. See `09_Lesson_Types_Locations.md`.

| Field | Type | Notes |
|-------|------|-------|
| teacherId | string | |
| name | string | e.g., "30-min Piano", "Group Guitar" |
| description | string? | |
| durationMinutes | number | |
| priceAmount | number | In cents. Displayed to students. |
| creditCost | number | Credits consumed per booking. Default: `1`. |
| isGroup | boolean | If `true`, used with `groupClasses` |
| allowedLocationIds | string[] | References `teacherProfiles.locations[].id` |
| active | boolean | Inactive types are hidden from booking |

**Composite indexes**:
- `teacherId` ASC, `active` ASC (teacher's active types)

---

### `availability`

**Purpose**: Teacher's bookable time slots. See `07_Availability_Management.md`.

| Field | Type | Notes |
|-------|------|-------|
| teacherId | string | |
| dayOfWeek | number | 0 (Sun) - 6 (Sat). Null if `specificDate` is set. |
| startTime | string | `"HH:mm"` in teacher's local time |
| endTime | string | `"HH:mm"` in teacher's local time |
| timezone | string | IANA timezone, e.g. `"America/New_York"` |
| locationId | string? | References `teacherProfiles.locations[].id` |
| recurring | boolean | `true` = weekly pattern, `false` = one-off |
| specificDate | Timestamp? | Set when `recurring` is `false` |
| blocked | boolean | `true` = time-off block, overrides recurring slots |

**Composite indexes**:
- `teacherId` ASC, `dayOfWeek` ASC, `blocked` ASC (weekly view)
- `teacherId` ASC, `specificDate` ASC (date-specific overrides)

---

### `lessons`

**Purpose**: Every booked lesson instance -- 1-on-1 and individual group class sessions.

| Field | Type | Notes |
|-------|------|-------|
| teacherId | string | |
| studentId | string | For 1-on-1. For group lessons, one doc per enrolled student. |
| lessonTypeId | string | |
| groupClassId | string? | Set for group lesson instances |
| locationId | string | |
| status | string | See status enum below |
| scheduledAt | Timestamp | Lesson start time (UTC) |
| durationMinutes | number | Copied from lessonType at booking time |
| creditDeducted | boolean | `true` when credit has been consumed |
| creditReturnedAt | Timestamp? | Set if credit was returned on cancellation |
| notes | string? | Teacher's post-lesson notes |
| cancelledAt | Timestamp? | |
| cancelledBy | string | `'teacher'`, `'student'`, or `'system'` |

**Status values**: `'scheduled'`, `'completed'`, `'cancelled_by_student'`, `'cancelled_by_teacher'`, `'no_show'`

**Composite indexes**:
- `teacherId` ASC, `scheduledAt` ASC, `status` ASC (teacher schedule view)
- `studentId` ASC, `scheduledAt` ASC, `status` ASC (student schedule view)
- `teacherId` ASC, `status` ASC, `scheduledAt` DESC (teacher history)
- `groupClassId` ASC, `scheduledAt` ASC (group class roster for a session)

---

### `groupClasses`

**Purpose**: Recurring or one-off group class definitions. Individual sessions are `lessons` docs. See `10_Group_Lessons.md`.

| Field | Type | Notes |
|-------|------|-------|
| teacherId | string | |
| lessonTypeId | string | Must reference a `lessonType` with `isGroup: true` |
| name | string | e.g., "Beginner Guitar Ensemble" |
| maxCapacity | number | Default: `20` [PRD unspecified] |
| enrolledStudentIds | string[] | Current committed roster |
| dayOfWeek | number | 0-6 |
| startTime | string | `"HH:mm"` |
| timezone | string | IANA timezone |
| locationId | string | |
| recurring | boolean | |
| status | string | `'active'`, `'paused'`, `'cancelled'` |

**Composite indexes**:
- `teacherId` ASC, `status` ASC (teacher's active groups)

---

### `subscriptionPlans`

**Purpose**: Teacher-defined monthly subscription offerings. See `11_Credit_System.md`.

| Field | Type | Notes |
|-------|------|-------|
| teacherId | string | |
| name | string | e.g., "4 Lessons/Month" |
| priceAmount | number | Monthly price in cents |
| creditsPerMonth | number | Credits granted on renewal |
| stripePriceId | string? | Created via Stripe API. Null until synced. |
| active | boolean | |

---

### `creditPacks`

**Purpose**: Teacher-defined one-time credit pack offerings. See `11_Credit_System.md`.

| Field | Type | Notes |
|-------|------|-------|
| teacherId | string | |
| name | string | e.g., "8-Lesson Pack" |
| credits | number | |
| priceAmount | number | In cents |
| stripePriceId | string? | |
| active | boolean | |

---

### `studentCredits`

**Purpose**: Credit balance per student-teacher pair. One document per relationship. See `11_Credit_System.md`.

**Document ID**: `{teacherId}_{studentId}`

| Field | Type | Notes |
|-------|------|-------|
| teacherId | string | |
| studentId | string | |
| balance | number | Current available credits |
| stripeSubscriptionId | string? | Active subscription, if any |
| subscriptionStatus | string? | `'active'`, `'past_due'`, `'cancelled'` |
| currentPeriodEnd | Timestamp? | When current billing period ends |
| lastRolloverAt | Timestamp? | Tracks rollover cap enforcement |

---

### `transactions`

**Purpose**: Immutable ledger of all credit and payment events. Append-only.

| Field | Type | Notes |
|-------|------|-------|
| teacherId | string | |
| studentId | string | |
| type | string | See types below |
| amount | number? | In cents. Null for non-monetary events. |
| credits | number? | Credits affected. Positive = granted, negative = consumed. |
| stripePaymentIntentId | string? | |
| stripeInvoiceId | string? | |
| lessonId | string? | For deduction/return events |
| description | string? | Human-readable summary |

**Type values**: `'subscription_payment'`, `'credit_pack_purchase'`, `'credit_deduction'`, `'credit_return'`, `'subscription_renewal'`, `'subscription_cancelled'`

**Composite indexes**:
- `teacherId` ASC, `createdAt` DESC (teacher transaction history)
- `studentId` ASC, `teacherId` ASC, `createdAt` DESC (student's history with a teacher)

---

### `practiceItems`

**Purpose**: Practice task checklist items assigned by teacher after a lesson. See `13_Lesson_Workflow.md`.

| Field | Type | Notes |
|-------|------|-------|
| lessonId | string | |
| teacherId | string | |
| studentId | string | |
| description | string | e.g., "Scales in C major -- 80bpm" |
| completed | boolean | Toggled by student |
| completedAt | Timestamp? | |
| sortOrder | number | Display ordering within a lesson's tasks |

**Composite indexes**:
- `studentId` ASC, `completed` ASC, `createdAt` DESC (student's open tasks)
- `lessonId` ASC, `sortOrder` ASC (tasks for a specific lesson)

---

### `fcmTokens`

**Purpose**: Push notification device tokens. See `15_Notifications.md`.

| Field | Type | Notes |
|-------|------|-------|
| userId | string | |
| token | string | FCM registration token |
| platform | string | `'web'` in MVP |
| lastUsedAt | Timestamp | Updated on each token refresh |

**Composite indexes**:
- `userId` ASC (all tokens for a user)

---

## Gaps & Assumptions

- **Assumption**: Locations are embedded in `teacherProfiles` rather than a separate collection. A teacher is unlikely to have more than 5-10 locations, so array queries are fine. If location management becomes complex, extract to a subcollection.
- **Assumption**: `lessons` stores one document per student per session, even for group classes. A group class with 8 students generates 8 `lessons` docs for one session. This simplifies per-student status tracking (cancellation, attendance, notes) at the cost of slightly higher write volume.
- **Assumption**: `transactions` is append-only. No updates or deletes. Corrections are recorded as new compensating entries.
- **Gap**: No `notifications` collection defined. Push notifications are fire-and-forget in MVP. If in-app notification history is needed, add a `notifications` collection post-MVP. See `18_Future_Features.md`.
- **Gap**: Teacher timezone is stored per availability slot but not on the teacher profile itself. If a teacher-wide default timezone is needed (e.g., for dashboard display), add `timezone` to `teacherProfiles`.
- **Gap**: No audit log collection. Admin-level actions (manual credit adjustments, etc.) are not tracked in MVP since admin tasks happen in Firebase Console.
- **Assumption**: Denormalized `studentDisplayName` on `teacherStudents` is updated via Cloud Function trigger when a user changes their display name. Slight staleness is acceptable.  
