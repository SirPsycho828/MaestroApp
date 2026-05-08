# Student Invitation & Onboarding

## Overview

Students join TuneFolio exclusively through teacher-generated invite links. There is no marketplace, no student self-registration, and no teacher search. A teacher enters a student's name and email, the system generates a unique link, and the student uses that link to create an account pre-connected to the teacher. A student can receive invites from multiple teachers and maintain independent relationships with each.

## Dependencies

- `01_Auth.md` -- Student registration flow, role assignment, custom claims
- `02_Database_Schema.md` -- `invites`, `teacherStudents`, `users` collections
- `03_API_Endpoints.md` -- `createInvite`, `validateInvite`, `revokeInvite`, `listInvites`
- `04_UI_Design_System.md` -- Form patterns, empty states, toast messages
- `15_Notifications.md` -- Email notification for invite delivery

---

## Teacher: Creating an Invite

### Access

- "Invite Student" button in the teacher's student roster page (`/students`)
- Also accessible from the dashboard prompt card when the teacher has zero students

### Form Fields

| Field | Required | Validation | Notes |
|-------|----------|------------|-------|
| Student name | Yes | 2-80 chars | Used for pre-fill on student registration |
| Student email | Yes | Valid email format | Invite is sent here. Also used for pre-fill. |

No other fields. Keep it minimal -- the student completes their own profile.

### On Submit

1. Client calls `createInvite` Cloud Function
2. Function generates a 24-character URL-safe token (`crypto.randomBytes(18).toString('base64url')`)
3. Creates `invites` doc with `status: 'pending'`, `expiresAt`: 30 days from now
4. Returns the full invite URL
5. System sends an email to the student (see Email Content below)
6. Teacher sees a success toast: "Invite sent to {name}"

### Invite URL Format

```
https://app.tunefolio.com/invite/{token}
```

### After Sending

The teacher is returned to their student roster. The invited student appears in a "Pending Invites" section below the active student list.

---

## Teacher: Managing Invites

### Pending Invites List

Shown on the `/students` page below the active roster.

| Column | Content |
|--------|---------|
| Name | Student name from invite |
| Email | Student email |
| Sent | Relative time ("3 days ago") |
| Status | "Pending" badge or "Expired" badge |
| Actions | Copy link, Resend, Revoke |

### Actions

**Copy link** -- Copies invite URL to clipboard. Toast: "Link copied". Useful when teachers want to share the link via text message or in person rather than email.

**Resend** -- Sends the invite email again with the same token. Does not generate a new token or reset the expiration. Toast: "Invite resent to {email}".

**Revoke** -- Marks the invite as expired immediately via `revokeInvite`. Confirmation dialog: "Revoke invite for {name}? They won't be able to use this link." Revoked invites disappear from the pending list.

### Empty State

"No pending invites. Invite your first student to get started." with "Invite Student" CTA.

---

## Student: Receiving the Invite

### Email Content

| Field | Value |
|-------|-------|
| Subject | "{Teacher name} invited you to TuneFolio" |
| From | noreply@tunefolio.com (via Firebase Extensions or SendGrid) |
| Body | "{Teacher name} has invited you to manage your music lessons on TuneFolio. Click below to create your account and get started." |
| CTA button | "Accept Invite" linking to `https://app.tunefolio.com/invite/{token}` |

Keep the email simple. No images, no multi-column layouts. Plain text fallback included.

---

## Student: Accepting the Invite

### Step 1: Landing Page (`/invite/{token}`)

On load, the app calls `validateInvite` with the token.

**If token is valid** (status `pending`, not expired):
- Display: "You've been invited by **{teacher name}**"
- Show teacher's profile photo (if available), studio name, and instruments
- Two CTAs: "Create Account" and "I already have an account"
- Pre-fill info shown: "We'll set up your account as {student name} ({student email})"

**If token is invalid or expired**:
- Display: "This invite link is no longer valid."
- Subtext: "It may have expired or been revoked. Contact your teacher for a new invite."
- No registration CTAs. Dead end.

**If token is already accepted**:
- Display: "This invite has already been used."
- CTA: "Log in" (in case it was this same student)

### Step 2a: New Account Registration

Student clicks "Create Account" and sees the registration form.

| Field | Pre-filled | Editable |
|-------|-----------|----------|
| Name | From invite | Yes |
| Email | From invite | Yes (but changing it means auth email differs from invite email -- that's fine) |
| Auth method | -- | Email/password, Google, or Apple |

If the student chooses Google or Apple Sign-In and the email from the provider differs from the invite email, that is acceptable. The connection is made via the invite token, not email matching (see `01_Auth.md`).

On successful registration:
1. Firebase Auth `onCreate` trigger fires
2. `onUserCreate` detects the invite token in registration metadata
3. Sets role to `student`, creates `users` doc
4. Marks invite as `accepted`, sets `acceptedBy` to new UID
5. Creates `teacherStudents` doc with `status: 'active'`
6. Student is redirected to `/home` (student dashboard)
7. Teacher receives a notification: "{Student name} accepted your invite" (see `15_Notifications.md`)

### Step 2b: Existing Account

Student clicks "I already have an account" and is sent to `/login` with the invite token preserved in a query param (`/login?invite={token}`).

After login:
1. Client detects the `invite` query param
2. Calls a `acceptInvite` callable function with the token
3. Function validates the token, verifies the logged-in user has role `student`
4. Creates `teacherStudents` doc connecting the student to the new teacher
5. Marks invite as accepted
6. Redirects to student dashboard with toast: "You're now connected with {teacher name}"

**If logged-in user is a teacher**: show an error: "Teacher accounts cannot accept student invites. Log in with a student account or create a new one."

---

## Multi-Teacher Support

A student connected to multiple teachers sees all teachers on their dashboard (see `17_Student_Dashboard.md`). Key behaviors:

- Each teacher relationship is independent (`teacherStudents` doc per pair)
- Credit balances are per-teacher (see `11_Credit_System.md`)
- Lesson history is per-teacher
- Practice tasks show across all teachers but are grouped by teacher
- Student can be deactivated by one teacher without affecting other relationships

### Connection from Teacher's Perspective

Teachers only see their own students. They cannot see which other teachers a student works with.

---

## Deactivating a Student

Teachers can deactivate a student relationship from the student roster.

- Sets `teacherStudents.status` to `'inactive'`
- Student no longer appears in the teacher's active roster (moves to an "Inactive" section)
- Student can no longer book lessons with this teacher
- Existing scheduled lessons remain (teacher must cancel them separately if desired)
- Student's remaining credits with this teacher are frozen (not deleted)
- Student still sees past lesson history with this teacher but cannot book new ones

### Reactivating

Teacher can reactivate from the Inactive section. Restores `status: 'active'`, unfreezes credits.

---

## Gaps & Assumptions

- **Assumption**: Invite emails are sent via Firebase Extensions (Trigger Email) or a simple SendGrid integration. No email template customization by teachers in MVP.
- **Assumption**: A teacher can send multiple invites to the same email address. Each generates a new token. Only the first one accepted creates the relationship; subsequent tokens for the same teacher-student pair are auto-expired.
- **Gap**: No bulk invite feature. Teachers invite students one at a time. Bulk import (CSV) is post-MVP. See `18_Future_Features.md`.
- **Gap**: `acceptInvite` callable function (for existing accounts accepting invites) is not listed in `03_API_Endpoints.md`. Add it to the Auth & Account section.
- **Gap**: No rate limit on invite creation. A teacher could spam invites. Default: max 50 pending invites per teacher. Enforce in `createInvite`.
- **Assumption**: The 30-day invite expiration is fixed. Teachers cannot customize it. If a student misses the window, the teacher sends a new invite.
- **Gap**: No mechanism for a student to request a connection to a teacher. Invitation is always teacher-initiated. Marketplace/discovery is post-MVP.  
