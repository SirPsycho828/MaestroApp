# API Endpoints

## Overview

Firebase Cloud Functions serving as the backend API. All endpoints are HTTPS callable functions unless marked as HTTP triggers. Authentication is required on all endpoints except where noted. The caller's role is verified via Firebase Auth custom claims.

## Dependencies

- `01_Auth.md` -- Role definitions, custom claims
- `02_Database_Schema.md` -- All collection schemas
- `11_Credit_System.md` -- Credit deduction and rollover logic
- `12_Stripe_Payments.md` -- Stripe Connect and checkout flows
- `14_Google_Calendar_Sync.md` -- Calendar sync triggers

## Conventions

- **Callable functions** use Firebase's `onCall` -- client calls via SDK, auth is automatic
- **HTTP triggers** use `onRequest` -- for webhooks and public endpoints
- **Background triggers** use `onCreate`, `onUpdate`, `onDelete` -- react to Firestore changes
- **Scheduled functions** use `onSchedule` -- cron-based
- Auth errors return `unauthenticated`. Permission errors return `permission-denied`. Validation errors return `invalid-argument`.
- All monetary values in cents

---

## Auth & Account

| Function | Type | Auth | Purpose |
|----------|------|------|---------|
| `onUserCreate` | Background (Auth onCreate) | -- | Create `users` doc, set custom claims, consume invite if token present |
| `onUserDelete` | Background (Auth onDelete) | -- | Soft-delete user doc, clean up FCM tokens |
| `deleteAccount` | Callable | Any | Cancel Stripe subscriptions, clear PII, delete Auth account |
| `refreshClaims` | Callable | Any | Force-refresh custom claims and return current role |

### `onUserCreate` logic
- Check if registration metadata includes an invite token
- If token exists and is valid: set role to `student`, consume invite, create `teacherStudents` doc
- If no token: set role to `teacher`
- Create `users` doc with role, `tosAcceptedAt`
- Set custom claim `{ role }`

---

## Teacher Profile

| Function | Type | Auth | Purpose |
|----------|------|------|---------|
| `updateTeacherProfile` | Callable | Teacher | Update profile fields, validate slug uniqueness |
| `checkSlugAvailable` | Callable | Teacher | Check if a URL slug is available |
| `getPublicTeacherProfile` | HTTP GET | None | Public teacher profile by slug |
| `completeSetupWizard` | Callable | Teacher | Mark `setupComplete: true`, validate required fields present |

### Slug validation
- Lowercase alphanumeric and hyphens only
- 3-40 characters
- Check against `teacherProfiles` for uniqueness
- Check against reserved words: `admin`, `api`, `app`, `login`, `register`, `invite`, `settings`, `help`

---

## Student Invitations

See `06_Student_Invitation.md` for full flow.

| Function | Type | Auth | Purpose |
|----------|------|------|---------|
| `createInvite` | Callable | Teacher | Generate invite token, create `invites` doc |
| `validateInvite` | HTTP GET | None | Check token validity, return teacher name + pre-fill data |
| `revokeInvite` | Callable | Teacher | Mark pending invite as expired |
| `listInvites` | Callable | Teacher | Return teacher's invites with status filter |

### `createInvite` logic
- Generate URL-safe token (24 chars, crypto-random)
- Set `expiresAt` to 30 days from now
- Return full invite URL: `app.tunefolio.com/invite/{token}`

---

## Lesson Types & Locations

| Function | Type | Auth | Purpose |
|----------|------|------|---------|
| `createLessonType` | Callable | Teacher | Create lesson type |
| `updateLessonType` | Callable | Teacher | Update lesson type. Cannot change `isGroup` after creation. |
| `toggleLessonTypeActive` | Callable | Teacher | Activate/deactivate. Deactivated types hidden from booking. |
| `updateLocations` | Callable | Teacher | Replace full locations array on `teacherProfiles` |

---

## Availability

See `07_Availability_Management.md` for slot logic.

| Function | Type | Auth | Purpose |
|----------|------|------|---------|
| `setAvailability` | Callable | Teacher | Create/update/delete availability slots (batch) |
| `getAvailableSlots` | Callable | Student | Get bookable slots for a teacher within a date range |
| `blockTime` | Callable | Teacher | Create a blocking override for a specific date/time |

### `getAvailableSlots` logic
- Merge recurring slots with specific-date overrides
- Subtract blocked slots
- Subtract already-booked lessons
- Return available windows grouped by date
- Date range limit: 30 days forward

---

## Lesson Scheduling

See `08_Lesson_Scheduling.md` for cancellation policy.

| Function | Type | Auth | Purpose |
|----------|------|------|---------|
| `bookLesson` | Callable | Student | Book a 1-on-1 lesson. Deducts credit. |
| `cancelLesson` | Callable | Teacher or Student | Cancel with policy enforcement |
| `completeLesson` | Callable | Teacher | Mark lesson as completed, trigger post-lesson prompt |
| `markNoShow` | Callable | Teacher | Mark student as no-show. Credit is not returned. |
| `getTeacherSchedule` | Callable | Teacher | Lessons within date range with filters |
| `getStudentSchedule` | Callable | Student | Own lessons within date range |

### `bookLesson` logic
1. Verify slot is still available (not booked, not blocked)
2. Verify student has credits with this teacher (`studentCredits.balance >= lessonType.creditCost`)
3. Deduct credits (atomic decrement on `studentCredits.balance`)
4. Create `lessons` doc with `status: 'scheduled'`, `creditDeducted: true`
5. Create `transactions` doc with `type: 'credit_deduction'`
6. Trigger Google Calendar sync if enabled (see `14_Google_Calendar_Sync.md`)
7. Send notification to teacher (see `15_Notifications.md`)

### `cancelLesson` logic
1. Check lesson status is `scheduled`
2. If cancelled by student: check against `cancellationWindowHours`
   - Within window (on time): return credit, set `creditReturnedAt`
   - Outside window (late): credit forfeited
3. If cancelled by teacher: always return credit
4. Update lesson status
5. Create `transactions` doc if credit returned
6. Trigger calendar sync to remove event
7. Notify the other party

---

## Group Classes

See `10_Group_Lessons.md`.

| Function | Type | Auth | Purpose |
|----------|------|------|---------|
| `createGroupClass` | Callable | Teacher | Create group class definition |
| `updateGroupClass` | Callable | Teacher | Update details, capacity |
| `enrollInGroupClass` | Callable | Student | Join a group class. Deducts credit per session. |
| `unenrollFromGroupClass` | Callable | Student | Leave a group class |
| `generateGroupSessions` | Scheduled | -- | Create upcoming `lessons` docs for recurring group classes |

### `enrollInGroupClass` logic
- Check capacity: `enrolledStudentIds.length < maxCapacity`
- Add student to `enrolledStudentIds`
- Credit is deducted per individual session when `generateGroupSessions` creates lesson docs, not at enrollment time

---

## Credit System

See `11_Credit_System.md` for business rules.

| Function | Type | Auth | Purpose |
|----------|------|------|---------|
| `getStudentCredits` | Callable | Teacher or Student | Get credit balance for a teacher-student pair |
| `processSubscriptionRenewal` | Background (Stripe webhook) | -- | Add monthly credits, enforce rollover cap |
| `processRollover` | Scheduled (monthly) | -- | Enforce rollover cap across all active subscriptions |

---

## Payments (Stripe)

See `12_Stripe_Payments.md` for Stripe integration details.

| Function | Type | Auth | Purpose |
|----------|------|------|---------|
| `createStripeConnectLink` | Callable | Teacher | Generate Stripe Connect onboarding URL |
| `checkStripeStatus` | Callable | Teacher | Check if Stripe onboarding is complete |
| `createCheckoutSession` | Callable | Student | Create Stripe Checkout session for credit pack or subscription |
| `createBillingPortalSession` | Callable | Student | Stripe billing portal for subscription management |
| `stripeWebhook` | HTTP POST | None (verified by Stripe signature) | Handle Stripe events |

### `stripeWebhook` handled events
- `checkout.session.completed` -- Fulfill credit pack or activate subscription
- `invoice.paid` -- Subscription renewal, add credits
- `invoice.payment_failed` -- Update `subscriptionStatus` to `past_due`
- `customer.subscription.deleted` -- Mark subscription cancelled

---

## Lesson Workflow

See `13_Lesson_Workflow.md`.

| Function | Type | Auth | Purpose |
|----------|------|------|---------|
| `saveLessonNotes` | Callable | Teacher | Save notes to a completed lesson |
| `savePracticeItems` | Callable | Teacher | Create/update practice items for a lesson |
| `togglePracticeItem` | Callable | Student | Mark practice item complete/incomplete |
| `getStudentPracticeItems` | Callable | Student | Get all open practice items across lessons |

---

## Google Calendar

See `14_Google_Calendar_Sync.md`.

| Function | Type | Auth | Purpose |
|----------|------|------|---------|
| `initiateCalendarAuth` | Callable | Any | Generate Google OAuth URL with calendar scope |
| `handleCalendarCallback` | HTTP GET | None (state param) | Exchange auth code, store refresh token |
| `syncLessonToCalendar` | Background (lessons onCreate/onUpdate) | -- | Create/update/delete Google Calendar event |

---

## Notifications

See `15_Notifications.md`.

| Function | Type | Auth | Purpose |
|----------|------|------|---------|
| `registerFcmToken` | Callable | Any | Store/update FCM token |
| `unregisterFcmToken` | Callable | Any | Remove FCM token on logout |
| `onLessonChange` | Background (lessons onWrite) | -- | Send notifications on booking, cancellation, completion |
| `onPracticeItemsCreated` | Background (practiceItems onCreate) | -- | Notify student of new practice tasks |

---

## Teacher Dashboard

| Function | Type | Auth | Purpose |
|----------|------|------|---------|
| `getTeacherAnalytics` | Callable | Teacher | Monthly revenue, lesson count, attendance rate |

### `getTeacherAnalytics` response shape
- `monthlyRevenue`: sum of `transactions.amount` for current month
- `lessonCount`: count of completed lessons this month
- `attendanceRate`: completed / (completed + no_show) as percentage
- Period: current calendar month, with comparison to previous month

---

## Gaps & Assumptions

- **Assumption**: All callable functions validate the caller's role via custom claims before executing. This is not repeated in every function description.
- **Assumption**: Firestore transactions are used for all operations involving credit balance changes to prevent race conditions (double-booking, double-deduction).
- **Gap**: No pagination specified. Default: 50 items per query. Functions returning lists should accept `limit` and `startAfter` cursor params.
- **Gap**: No rate limiting beyond Firebase Auth's built-in protections. Sufficient for single-teacher launch. Add Cloud Armor or custom rate limiting before scaling.
- **Gap**: Bulk operations (e.g., teacher cancels all lessons for a day) are not specified. Handle as sequential individual cancellations in MVP.
- **Gap**: No endpoint for teacher to manually adjust credits. In MVP, manual adjustments happen through Firebase Console. Add `adjustCredits` callable post-MVP.
- **Assumption**: `generateGroupSessions` runs on a weekly schedule and creates lesson docs for the next 4 weeks of recurring group classes. Existing future sessions are not duplicated (idempotent check on `groupClassId` + `scheduledAt`).  
