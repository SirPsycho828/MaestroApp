# Google Calendar Sync

## Overview

TuneFolio offers one-way sync from TuneFolio to Google Calendar. When a lesson is booked, a Google Calendar event is created on the user's calendar. When a lesson is cancelled, the event is removed. Teacher availability is managed exclusively in TuneFolio -- Google Calendar events do not block availability or create lessons. Both teachers and students can connect their Google Calendar independently.

## Dependencies

- `01_Auth.md` -- Google OAuth (initial sign-in uses `email` + `profile` scopes only; calendar scope is requested separately)
- `02_Database_Schema.md` -- `lessons` collection (event sync triggers on status changes)
- `03_API_Endpoints.md` -- `initiateCalendarAuth`, `handleCalendarCallback`, `syncLessonToCalendar`
- `15_Notifications.md` -- Calendar sync errors surface as notifications

---

## Connecting Google Calendar

### Separate OAuth Flow

Calendar access is not requested during initial Google Sign-In. The `calendar.events` scope is requested only when the user explicitly opts into calendar sync. This avoids an intimidating permission prompt at registration.

Users who signed up with email/password or Apple can still connect Google Calendar -- it is not tied to the sign-in provider.

### Settings Page (`/settings/calendar`)

| State | UI |
|-------|-----|
| Not connected | "Connect Google Calendar" button with explanation: "Booked lessons will automatically appear on your Google Calendar." |
| Connected | Green check, connected Google account email, "Disconnect" button |
| Error | Red warning with error message, "Reconnect" button |

### Connection Flow

1. User clicks "Connect Google Calendar"
2. Client calls `initiateCalendarAuth`
3. Function generates a Google OAuth URL:
   - `scope`: `https://www.googleapis.com/auth/calendar.events`
   - `access_type`: `offline` (for refresh token)
   - `prompt`: `consent` (force consent screen to get refresh token)
   - `state`: encrypted payload with `{ userId, returnUrl }`
4. Client redirects to Google's consent screen
5. User grants calendar access
6. Google redirects to `handleCalendarCallback` with auth code
7. Function exchanges code for tokens:
   - Store `refresh_token` encrypted in a `calendarTokens` doc (server-side only)
   - Do not store `access_token` (short-lived, refreshed as needed)
8. Function sets a flag on the user doc or a `calendarSync` doc indicating sync is enabled
9. Redirect user back to `/settings/calendar` with success indicator

### Token Storage

| Field | Collection | Notes |
|-------|-----------|-------|
| `userId` | `calendarTokens` | Document ID = user's UID |
| `refreshToken` | `calendarTokens` | Encrypted at rest. Only readable by Cloud Functions. |
| `email` | `calendarTokens` | Google account email (for display on settings page) |
| `enabled` | `calendarTokens` | `true` when connected, `false` when disconnected |
| `lastSyncError` | `calendarTokens` | Error message from last failed sync attempt, null if healthy |

**Security**: The `calendarTokens` collection must have restrictive Firestore rules -- no client reads or writes. All access is through Cloud Functions only.

```
calendarTokens/{userId}:
  read: false
  write: false
  // All access via Cloud Functions with admin SDK
```

### Disconnecting

1. User clicks "Disconnect" on the settings page
2. Confirmation dialog: "Disconnect Google Calendar? Future lessons won't be added to your calendar. Existing calendar events will remain."
3. Client calls a `disconnectCalendar` callable function
4. Function:
   - Revokes the Google OAuth token via Google's revocation endpoint
   - Sets `calendarTokens.enabled: false`
   - Clears `refreshToken`
5. Existing Google Calendar events are not deleted (too disruptive and complex to track)

---

## Syncing Lessons to Calendar

### Trigger

The `syncLessonToCalendar` background function triggers on writes to the `lessons` collection. It fires on:
- **Create** (new booking): create a calendar event
- **Update** (status change): update or delete the calendar event

### Sync Logic

| Lesson Event | Calendar Action |
|-------------|----------------|
| Lesson created (`scheduled`) | Create calendar event |
| Lesson cancelled (any cancellation status) | Delete calendar event |
| Lesson completed | Update event title to include "(Completed)" |
| Lesson time/location changed | Update calendar event |

### Who Gets Calendar Events

For each lesson, sync to:
1. **Teacher's calendar** (if teacher has calendar sync enabled)
2. **Student's calendar** (if student has calendar sync enabled)

Each user gets their own independent calendar event. The function checks `calendarTokens.enabled` for both the teacher and student and syncs to each independently.

### Calendar Event Shape

```
Summary:  "[Lesson Type] - [Other Party Name]"
          Teacher sees: "30-Min Piano - Alice Smith"
          Student sees: "30-Min Piano - Sarah Johnson"

Start:    lesson.scheduledAt (converted to RFC 3339)
End:      lesson.scheduledAt + lesson.durationMinutes

Location: location.name + location.address (in-person)
          location.virtualLink (virtual)

Description:
  "TuneFolio lesson
   Type: [lesson type name]
   [Teacher/Student]: [name]
   Location: [location name]"
```

### Storing the Calendar Event ID

After creating a Google Calendar event, store the event ID to enable future updates and deletions.

Add to the `lessons` doc:
- `calendarEventIds`: `{ [userId]: eventId }` -- a map of user ID to Google Calendar event ID

Example: `{ "uid_teacher": "abc123", "uid_student": "def456" }`

This allows the sync function to update or delete the correct event for each user.

---

## Error Handling

### Token Expiration

Google refresh tokens can expire or be revoked by the user outside TuneFolio. When the sync function encounters an auth error:

1. Retry once with a fresh token refresh
2. If still failing: set `calendarTokens.lastSyncError` to the error message
3. Set `calendarTokens.enabled: false`
4. Send a notification to the user: "Google Calendar sync was disconnected. Reconnect from Settings." (see `15_Notifications.md`)
5. Do not block the lesson operation -- calendar sync failures are non-critical

### API Errors

For non-auth Google Calendar API errors (rate limits, server errors):

1. Retry with exponential backoff (3 attempts, 1s/2s/4s)
2. If all retries fail: log the error, set `lastSyncError`
3. Do not notify the user for transient errors
4. A background reconciliation job can retry failed syncs (see Reconciliation below)

### Partial Failures

If sync succeeds for the teacher but fails for the student (or vice versa), each is handled independently. A failure for one user does not affect the other.

---

## Reconciliation

A scheduled Cloud Function runs daily to catch missed or failed syncs.

### Logic

1. Query `lessons` where `status: 'scheduled'` and `scheduledAt` is within the next 7 days
2. For each lesson, check if `calendarEventIds` exists for each connected user
3. If a user has calendar sync enabled but no event ID on the lesson: create the event
4. If a user's event ID exists but the lesson is cancelled: delete the event
5. Log reconciliation results

This handles edge cases where the real-time trigger failed silently or where a user connected calendar sync after lessons were already booked.

---

## What Is Not Synced

To be explicit about the one-way boundary:

| Direction | Supported |
|-----------|-----------|
| TuneFolio lesson created -> Google Calendar event | Yes |
| TuneFolio lesson cancelled -> Google Calendar event deleted | Yes |
| TuneFolio lesson updated -> Google Calendar event updated | Yes |
| Google Calendar event created -> TuneFolio lesson | No |
| Google Calendar event deleted -> TuneFolio lesson cancelled | No |
| Google Calendar busy time -> TuneFolio availability blocked | No |

Teachers manage availability exclusively in TuneFolio (see `07_Availability_Management.md`). Two-way sync is post-MVP (see `18_Future_Features.md`).

---

## Gaps & Assumptions

- **Assumption**: Google Calendar API v3 is used. The `calendar.events` scope grants read/write access to all calendars. Events are created on the user's primary calendar.
- **Assumption**: Refresh tokens are encrypted at rest in Firestore using a Cloud KMS key or a server-side encryption utility. The encryption method is an infrastructure decision left to implementation.
- **Assumption**: `calendarTokens` is a new collection not listed in `02_Database_Schema.md`. It should be added. It was omitted from the schema file because it contains sensitive tokens that should not be documented alongside the general schema.
- **Gap**: No calendar selection. Events always go to the user's primary Google Calendar. Letting users choose a specific calendar is post-MVP.
- **Gap**: No Apple Calendar or Outlook sync. Google Calendar only in MVP. Other calendar providers are post-MVP.
- **Gap**: No `.ics` file download as a fallback for non-Google users. A simple alternative would be generating `.ics` attachments in booking confirmation emails. Post-MVP.
- **Gap**: Group lesson calendar events are created per student (each enrolled student gets their own event). The teacher gets one event per session regardless of enrollment count. The teacher's event summary could include the student count: "Beginner Guitar Ensemble (6 students)".
- **Gap**: The `disconnectCalendar` callable function is not listed in `03_API_Endpoints.md`. Add it to the Google Calendar section.  
