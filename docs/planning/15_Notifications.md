▸ Extended thinking (1003 chars)  
# Notifications

## Overview

TuneFolio sends push notifications (via Firebase Cloud Messaging) and email notifications for key events. Push is the primary channel; email serves as a fallback for users who are offline or have push disabled. No in-app notification inbox in MVP -- notifications are fire-and-forget. Users can opt out of notification categories from settings.

## Dependencies

- `02_Database_Schema.md` -- `fcmTokens` collection
- `03_API_Endpoints.md` -- `registerFcmToken`, `unregisterFcmToken`, background triggers
- `04_UI_Design_System.md` -- Toast patterns for in-app feedback (separate from push)
- `01_Auth.md` -- Token cleanup on logout and account deletion

---

## Channels

### Push Notifications (FCM)

- Firebase Cloud Messaging for web push
- Requires service worker registration (`firebase-messaging-sw.js`)
- Permission requested after first login, not during registration (avoids browser prompt fatigue)
- If user denies browser notification permission, degrade gracefully -- no repeated prompts

### Email Notifications

- Sent via Firebase Extensions (Trigger Email from Firestore) or SendGrid
- All emails use a single branded template: TuneFolio header, content body, footer with unsubscribe link
- From address: `notifications@tunefolio.com` (or `noreply@tunefolio.com`)
- Plain text fallback included for all emails

---

## FCM Token Lifecycle

### Registration

1. After login, client requests notification permission from the browser
2. If granted: retrieve FCM token via `getToken()`
3. Call `registerFcmToken` with the token and `platform: 'web'`
4. Function creates or updates `fcmTokens` doc, sets `lastUsedAt`

### Refresh

- FCM tokens can rotate. The client listens for `onTokenRefresh` and calls `registerFcmToken` with the new token.
- Old tokens are overwritten (matched by `userId` + `platform`).

### Cleanup

- On logout: client calls `unregisterFcmToken` to remove the token
- On account deletion: all `fcmTokens` docs for the user are deleted by the `deleteAccount` function (see `01_Auth.md`)
- Stale tokens: if FCM returns `messaging/registration-token-not-registered` when sending, delete the token doc

---

## Notification Events

### Teacher Notifications

| Event | Push Title | Push Body | Email | Trigger |
|-------|-----------|-----------|-------|---------|
| Student booked a lesson | "New Booking" | "{Student} booked {lesson type} on {date} at {time}" | Yes | `lessons` onCreate |
| Student cancelled a lesson | "Lesson Cancelled" | "{Student} cancelled {lesson type} on {date}" | Yes | `lessons` onUpdate to cancelled status |
| Student accepted invite | "Invite Accepted" | "{Student} joined TuneFolio and is ready to book" | Yes | `invites` onUpdate to `accepted` |
| Student enrolled in group class | "New Enrollment" | "{Student} enrolled in {class name}" | No | `groupClasses` onUpdate (enrolledStudentIds changed) |
| Student unenrolled from group class | "Student Left Class" | "{Student} left {class name}" | No | `groupClasses` onUpdate |
| Post-lesson review prompt | "Lesson Review" | "How did your lesson with {student} go? Add notes and practice tasks." | No | Scheduled, 15 min after lesson end |
| Payment received | "Payment Received" | "{Student} purchased {plan/pack name} -- {amount}" | Yes | `transactions` onCreate for payment types |

### Student Notifications

| Event | Push Title | Push Body | Email | Trigger |
|-------|-----------|-----------|-------|---------|
| Teacher cancelled a lesson | "Lesson Cancelled" | "{Teacher} cancelled your {lesson type} on {date}. Your credit has been returned." | Yes | `lessons` onUpdate to `cancelled_by_teacher` |
| Practice tasks assigned | "Practice Tasks" | "{Teacher} assigned {count} practice tasks from your {lesson type} lesson" | Yes | `practiceItems` batch onCreate |
| Lesson reminder | "Upcoming Lesson" | "{Lesson type} with {teacher} tomorrow at {time}" | Yes | Scheduled, 24 hrs before lesson |
| Credit balance low | "Credits Running Low" | "You have {count} credit(s) remaining with {teacher}. Buy more to keep booking." | No | `studentCredits` onUpdate, balance <= 2 |
| Subscription payment failed | "Payment Failed" | "Your subscription payment to {teacher} failed. Update your payment method." | Yes | `studentCredits` onUpdate to `past_due` |
| Subscription renewed | "Subscription Renewed" | "Your subscription with {teacher} renewed. {credits} credits added." | No | `transactions` onCreate for renewal |
| Calendar sync disconnected | "Calendar Disconnected" | "Google Calendar sync was disconnected. Reconnect from Settings." | No | `calendarTokens` onUpdate |

---

## Notification Delivery Logic

### Sending a Notification

All notifications flow through a shared `sendNotification` utility function used by background triggers:

```
sendNotification({
  userId,
  category,
  push: { title, body, data },
  email: { subject, bodyText, bodyHtml } | null
})
```

### Steps

1. Check user's notification preferences (see Preferences below). If category is opted out, skip entirely.
2. **Push**: query `fcmTokens` for the user. Send to all registered tokens via FCM `sendMulticast`. Handle token errors (delete invalid tokens).
3. **Email** (if applicable): write a doc to the `emailQueue` collection (picked up by Firebase Trigger Email extension) or call SendGrid API directly.

### Push Data Payload

All push notifications include a `data` field for client-side routing:

| Field | Value |
|-------|-------|
| `type` | Event type (e.g., `lesson_booked`, `practice_assigned`) |
| `targetUrl` | Deep link path (e.g., `/lessons/{lessonId}`, `/practice`) |

The client's service worker handles the push click by navigating to `targetUrl`.

---

## Notification Preferences

### Settings Page (`/settings/notifications`)

Users can opt out of notification categories. Preferences are stored on the `users` doc in a `notificationPrefs` map.

### Teacher Preferences

| Category | Default | Controls |
|----------|---------|----------|
| Bookings | On | New booking, cancellation |
| Student activity | On | Invite accepted, enrollment changes |
| Lesson reminders | On | Post-lesson review prompt |
| Payments | On | Payment received |

### Student Preferences

| Category | Default | Controls |
|----------|---------|----------|
| Lesson updates | On | Cancellations by teacher |
| Practice tasks | On | New tasks assigned |
| Lesson reminders | On | 24-hour reminder |
| Credits & payments | On | Low balance, payment failed, renewal |

### Storage

```
users.notificationPrefs: {
  bookings: true,
  studentActivity: true,
  lessonReminders: true,
  payments: true,
  lessonUpdates: true,
  practiceTasks: true,
  creditsPayments: true
}
```

Missing keys default to `true` (opted in). This ensures new notification categories added later are on by default.

---

## Scheduled Notifications

Two notifications are time-based rather than event-driven:

### Lesson Reminder (24 hours before)

- Scheduled Cloud Function runs every hour
- Queries `lessons` where `status: 'scheduled'` and `scheduledAt` is between 23 and 25 hours from now
- Sends reminder to the student
- Idempotent: track sent reminders with a `reminderSentAt` field on the `lessons` doc to avoid duplicates

### Post-Lesson Review Prompt (15 minutes after)

- Scheduled Cloud Function runs every 15 minutes
- Queries `lessons` where `status: 'scheduled'` and `scheduledAt + durationMinutes` is 15 to 30 minutes in the past
- Sends prompt to the teacher
- Idempotent: track with a `reviewPromptSentAt` field on the `lessons` doc

---

## Email Templates

All emails share a consistent structure:

### Layout

- **Header**: TuneFolio logo (simple text logo, not an image) + horizontal rule
- **Body**: 1-2 sentences, no fluff. The notification event and any required action.
- **CTA button**: Deep link to the relevant page (e.g., "View Lesson", "Buy Credits")
- **Footer**: "You received this because you have a TuneFolio account. Manage notification preferences: {link}"

### Template Variables

| Variable | Source |
|----------|--------|
| `{{recipientName}}` | `users.displayName` |
| `{{teacherName}}` / `{{studentName}}` | Other party's display name |
| `{{lessonType}}` | `lessonTypes.name` |
| `{{dateTime}}` | Formatted in recipient's timezone |
| `{{actionUrl}}` | Full URL to relevant page |

---

## Gaps & Assumptions

- **Assumption**: No in-app notification inbox or history. Notifications are push + email only. If a user misses a push notification, it is gone. An in-app notification feed is post-MVP. See `18_Future_Features.md`.
- **Assumption**: Email delivery uses Firebase Trigger Email extension (writes to a `emailQueue` collection, extension sends via configured SMTP or SendGrid). No custom email service.
- **Assumption**: Push notification permission is requested once after first login. If denied, the app does not ask again. A settings page note says "Enable notifications in your browser settings to receive push alerts."
- **Gap**: No SMS notifications. Push and email only. SMS is post-MVP.
- **Gap**: No notification batching or digest. Each event triggers an individual notification. A teacher who receives 5 bookings in a row gets 5 separate push notifications. A daily digest option is post-MVP.
- **Gap**: No quiet hours. Notifications are sent immediately regardless of time. Quiet hours (e.g., no push between 10 PM and 8 AM) are post-MVP.
- **Gap**: `notificationPrefs` field and `reminderSentAt` / `reviewPromptSentAt` fields are not listed in `02_Database_Schema.md`. Add `notificationPrefs` to the `users` collection schema and the tracking fields to the `lessons` collection.
- **Gap**: No notification for lesson time approaching (e.g., "Your lesson starts in 1 hour"). Only the 24-hour reminder is implemented. A shorter reminder is post-MVP.  
