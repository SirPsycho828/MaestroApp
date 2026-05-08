# Authentication

## Overview

TuneFolio uses Firebase Authentication with three providers: email/password, Google Sign-In, and Apple Sign-In. Apple Sign-In is mandatory per App Store rules when any third-party sign-in (Google) is offered. Two roles exist: **teacher** and **student**. Role is stored in Firestore and mirrored to Firebase Auth custom claims for use in security rules and Cloud Functions.

## Dependencies

- `02_Database_Schema.md` -- User document structure and role field
- `03_API_Endpoints.md` -- Custom claims sync endpoint, account creation triggers
- `06_Student_Invitation.md` -- Invite token validation during student registration

## Auth Providers

| Provider | Notes |
|----------|-------|
| Email/password | Standard Firebase email/password. Email verification required before first login. |
| Google Sign-In | OAuth 2.0 via Firebase. Scopes: `email`, `profile`. Additional `calendar.events` scope requested later during Google Calendar sync setup (see `14_Google_Calendar_Sync.md`), not at initial sign-in. |
| Apple Sign-In | Required for App Store compliance. Apple may withhold the user's real email (relay address). Store the relay address and handle it gracefully -- never display it in UI. |

## Roles & Permissions

Two roles. No admin role in MVP -- admin tasks are handled directly in Firebase Console.

| Permission | Teacher | Student |
|------------|---------|---------|
| Create/edit own profile | Yes | Yes |
| Create lesson types & pricing | Yes | No |
| Set availability | Yes | No |
| View/manage own students | Yes | No |
| Generate student invite links | Yes | No |
| Book lessons | No | Yes |
| Cancel lessons | Yes | Yes (subject to policy) |
| Purchase credits/subscriptions | No | Yes |
| View credit balance | Own students' balances | Own balance per teacher |
| Write lesson notes | Yes | No |
| Assign practice tasks | Yes | No |
| View practice tasks | Own students' tasks | Own tasks |
| View lesson notes | Own lessons | Own lessons |
| View analytics dashboard | Yes | No |
| Connect Google Calendar | Yes | Yes |
| Manage Stripe Connect account | Yes | No |

## Registration Flows

### Teacher registration

1. User lands on `/register/teacher`
2. Signs up via any auth provider
3. Firebase Auth account created
4. `onCreate` Cloud Function triggers:
   - Creates user document in `users` collection with `role: 'teacher'`
   - Sets custom claim `{ role: 'teacher' }` on the Firebase Auth user
5. Client detects new account, redirects to teacher setup wizard (see `05_Teacher_Onboarding.md`)

### Student registration (via invite)

1. Student receives invite link: `app.tunefolio.com/invite/{token}`
2. App validates the invite token against `invites` collection
3. If token is valid and unexpired, student sees registration form pre-filled with their name/email from the invite
4. Signs up via any auth provider
5. `onCreate` Cloud Function triggers:
   - Creates user document with `role: 'student'`
   - Sets custom claim `{ role: 'student' }`
   - Consumes the invite token (marks it as used)
   - Creates the teacher-student relationship document (see `06_Student_Invitation.md`)
6. Client redirects to student dashboard

### Student registration without invite

Not supported in MVP. If a user navigates to a generic registration page, they can only register as a teacher. Students must use an invite link. Display a clear message: "Ask your teacher for an invite link to get started."

## Custom Claims

Custom claims are the source of truth for authorization in Firestore security rules and Cloud Functions.

| Claim | Values | Set By |
|-------|--------|--------|
| `role` | `'teacher'` or `'student'` | `onCreate` Cloud Function |

### Claim Sync

Custom claims do not propagate to the client immediately. After the `onCreate` function sets claims:
- Client calls `getIdTokenResult(true)` to force-refresh the token
- If claims are still missing (race condition), client retries with exponential backoff up to 3 attempts
- UI shows a brief loading state ("Setting up your account...") during this window

## Session Handling

- **Token refresh**: Firebase Auth handles ID token refresh automatically (tokens expire every hour)
- **Persistence**: Use `browserLocalPersistence` so users stay logged in across browser sessions
- **Multi-tab**: Firebase Auth handles multi-tab session sync natively
- **Logout**: Clear Firebase Auth state, revoke FCM token for push notifications (see `15_Notifications.md`), redirect to landing page

## Route Protection

### Public routes
- `/` -- Landing page
- `/register/teacher` -- Teacher registration
- `/invite/{token}` -- Student invite + registration
- `/teacher/{slug}` -- Public teacher profile (read-only)
- `/login` -- Login page

### Authenticated routes (any role)
- `/settings` -- Account settings
- `/calendar/connect` -- Google Calendar OAuth

### Teacher-only routes
- `/dashboard` -- Teacher dashboard
- `/students` -- Student roster
- `/availability` -- Availability management
- `/lessons` -- Lesson management
- `/lesson-types` -- Lesson type configuration
- `/analytics` -- Revenue and attendance
- `/stripe/setup` -- Stripe Connect onboarding
- `/invite/create` -- Generate invite links

### Student-only routes
- `/home` -- Student dashboard
- `/book/{teacherSlug}` -- Lesson booking
- `/practice` -- Practice tasks
- `/credits` -- Credit balances and purchase history

### Route guard behavior
- Unauthenticated user hits protected route: redirect to `/login` with return URL in query param
- Teacher hits student-only route: redirect to `/dashboard`
- Student hits teacher-only route: redirect to `/home`
- Check `role` from cached ID token claims, not from a Firestore read

## Account Linking

A user who registers with email/password and later tries to sign in with Google (or vice versa) using the same email:

- Firebase Auth `fetchSignInMethodsForEmail` is deprecated. Instead, handle the `auth/account-exists-with-different-credential` error during sign-in.
- Prompt the user to sign in with their original provider, then link the new provider to their existing account via `linkWithCredential`.
- Do not auto-merge accounts. Always require the user to prove ownership of the original account first.

## Account Deletion

- Users can request account deletion from `/settings`
- Triggers a Cloud Function that:
  - Cancels any active Stripe subscriptions (see `12_Stripe_Payments.md`)
  - Removes FCM tokens
  - Soft-deletes the user document (sets `deletedAt` timestamp, clears PII)
  - Deletes the Firebase Auth account
- Teacher deletion: orphaned students see a "teacher no longer active" state on their dashboard. Credits are frozen (no refund logic in MVP -- handle manually).
- Student deletion: teacher sees the student as "account removed" in their roster. Lesson history is retained with PII stripped.

## Firestore Security Rules (Auth-Related)

```
// Pseudocode — translate to actual Firestore rules syntax

users/{userId}:
  read: if request.auth.uid == userId
        OR (request.auth.token.role == 'teacher'
            AND teacherStudentRelationshipExists)
  write: if request.auth.uid == userId
         AND request.resource.data.role == resource.data.role  // cannot change own role

invites/{inviteId}:
  read: if true  // invite tokens are validated during registration
  create: if request.auth.token.role == 'teacher'
  update: if false  // consumed by Cloud Function only
  delete: if request.auth.token.role == 'teacher'
          AND resource.data.teacherId == request.auth.uid
```

Full security rules for other collections are in `02_Database_Schema.md`.

## Terms of Service & Age Restriction

- All users must accept ToS during registration
- ToS states users must be 18+
- No age verification gate in MVP -- ToS acceptance is the legal mechanism
- Parents create their own (adult) accounts to manage lessons for minor children
- Store `tosAcceptedAt` timestamp on the user document
- No COPPA compliance flow in MVP

## Gaps & Assumptions

- **Assumption**: Apple relay email addresses are stored as-is. If a teacher invites a student by real email but the student signs up with Apple using a relay, the invite match is done by invite token, not email comparison.
- **Assumption**: No multi-factor authentication in MVP. Can be enabled later via Firebase Auth.
- **Assumption**: No rate limiting on registration in MVP. Firebase Auth has built-in abuse protection, which is sufficient at launch scale (single teacher dogfooding).
- **Gap**: Password reset flow is not specified. Default to Firebase Auth's built-in `sendPasswordResetEmail` with default templates. Custom email templates are post-MVP.
- **Gap**: What happens if a user registers as a teacher but then receives a student invite? MVP default: they cannot accept it. A user has one role. They would need a separate account for a different role.
- **Gap**: Session duration / forced re-auth policy not specified. Default: sessions persist until explicit logout. No forced re-auth timeout in MVP.  
