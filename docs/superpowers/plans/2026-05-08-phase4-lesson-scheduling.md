# Phase 4: Lesson Scheduling & Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete lesson scheduling flow — teachers manage availability, students book lessons, both parties view/manage their schedules.

**Architecture:** Cloud Functions handle all booking/cancellation logic atomically via Firestore transactions (credit deduction, double-booking prevention, cancellation policy enforcement). Teacher availability is managed via direct Firestore client writes (matching setup wizard pattern — security rules already allow it). `getAvailableSlots` computes bookable slots server-side since students can't query other students' lessons. Times are stored as "HH:mm" in the teacher's IANA timezone; `scheduledAt` on lessons is a UTC Firestore Timestamp.

**Tech Stack:** Firebase Cloud Functions v2 (onCall), Firestore transactions + batch writes, React 19, React Router, shadcn/ui, Lucide icons

---

## File Structure

### New Files

```
functions/src/utils/timezone.ts                  # Server-side timezone helpers
functions/src/scheduling/get-available-slots.ts  # Compute bookable slots
functions/src/scheduling/book-lesson.ts          # Book + deduct credit atomically
functions/src/scheduling/cancel-lesson.ts        # Cancel + policy enforcement
functions/src/scheduling/complete-lesson.ts      # Mark lesson completed
functions/src/scheduling/mark-no-show.ts         # Mark student no-show

src/lib/time-utils.ts                            # Client-side time/date formatting

src/pages/teacher/availability.tsx               # Weekly grid + overrides
src/pages/teacher/schedule.tsx                   # Lesson list with actions
src/pages/student/book.tsx                       # 3-step booking flow

src/components/availability/override-form.tsx    # Add override or block
src/components/availability/override-list.tsx    # List upcoming overrides
src/components/booking/lesson-type-picker.tsx    # Step 1: choose lesson type
src/components/booking/date-slot-picker.tsx      # Step 2: choose date + time
src/components/booking/booking-confirm.tsx       # Step 3: confirm booking
src/components/schedule/lesson-card.tsx          # Reusable lesson display card
src/components/schedule/lesson-actions.tsx       # Detail panel with actions
```

### Modified Files

```
functions/src/index.ts                           # Export new Cloud Functions
src/App.tsx                                      # Add routes
src/pages/student/home.tsx                       # Teacher list + upcoming lessons
src/components/setup/availability-grid.tsx        # Add submitLabel prop
firestore.indexes.json                           # Add student schedule index
```

---

### Task 1: Timezone Utilities

**Files:**
- Create: `functions/src/utils/timezone.ts`

- [ ] **Step 1: Create timezone utility module**

```typescript
// functions/src/utils/timezone.ts
import { Timestamp } from "firebase-admin/firestore";

/** "HH:mm" to minutes since midnight */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes since midnight to "HH:mm" */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Convert local date/time in a timezone to UTC Date.
 * Uses Intl offset calculation — handles DST correctly.
 */
export function localToUtc(
  dateStr: string,
  timeStr: string,
  timezone: string
): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);

  // Treat local values as UTC (our "guess")
  const guess = new Date(Date.UTC(year, month - 1, day, hours, minutes));

  // Find what local time this UTC instant is in the target timezone
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(guess);

  const get = (type: string) => {
    const val = parts.find((p) => p.type === type)?.value ?? "0";
    return parseInt(val === "24" ? "0" : val);
  };

  const localAsUtc = new Date(
    Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"))
  );

  // offset = localAsUtc - guess; real UTC = guess - offset
  return new Date(guess.getTime() - (localAsUtc.getTime() - guess.getTime()));
}

/** Convert UTC Date/Timestamp to local components in a timezone. */
export function utcToLocal(
  utc: Date | Timestamp,
  timezone: string
): { dateStr: string; time: string; dayOfWeek: number } {
  const date = utc instanceof Timestamp ? utc.toDate() : utc;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  let hour = get("hour");
  if (hour === "24") hour = "00";

  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };

  return {
    dateStr: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${hour}:${get("minute")}`,
    dayOfWeek: weekdayMap[get("weekday")],
  };
}

/** Convert local date/time to Firestore Timestamp. */
export function localToTimestamp(
  dateStr: string,
  timeStr: string,
  timezone: string
): Timestamp {
  return Timestamp.fromDate(localToUtc(dateStr, timeStr, timezone));
}
```

- [ ] **Step 2: Verify build**

Run: `cd functions && npm run build 2>&1`
Expected: Clean compilation

- [ ] **Step 3: Commit**

```bash
git add functions/src/utils/timezone.ts
git commit -m "feat: add timezone conversion utilities for scheduling"
```

---

### Task 2: getAvailableSlots Cloud Function

**Files:**
- Create: `functions/src/scheduling/get-available-slots.ts`

**Context:** This is the most complex function — it computes bookable 30-minute slots by layering recurring availability + date overrides - blocks - booked lessons. Read `functions/src/utils/timezone.ts` for the helpers it uses.

- [ ] **Step 1: Create the getAvailableSlots function**

```typescript
// functions/src/scheduling/get-available-slots.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { timeToMinutes, minutesToTime, localToUtc, utcToLocal } from "../utils/timezone";

export const getAvailableSlots = onCall(async (request) => {
  const { teacherId, startDate, endDate } = request.data ?? {};

  if (!teacherId || !startDate || !endDate) {
    throw new HttpsError("invalid-argument", "teacherId, startDate, and endDate are required");
  }

  const start = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");
  const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000);
  if (diffDays < 0 || diffDays > 30) {
    throw new HttpsError("invalid-argument", "Date range must be 0-30 days");
  }

  const db = getFirestore();

  // Get teacher's timezone from any availability doc
  const anyAvail = await db
    .collection("availability")
    .where("teacherId", "==", teacherId)
    .limit(1)
    .get();

  if (anyAvail.empty) {
    return { slots: [], timezone: "America/New_York" };
  }
  const timezone: string = anyAvail.docs[0].data().timezone;

  // Two queries: all availability docs + scheduled lessons in range
  const [availSnap, lessonsSnap] = await Promise.all([
    db.collection("availability").where("teacherId", "==", teacherId).get(),
    db
      .collection("lessons")
      .where("teacherId", "==", teacherId)
      .where("status", "==", "scheduled")
      .where("scheduledAt", ">=", Timestamp.fromDate(localToUtc(startDate, "00:00", timezone)))
      .where("scheduledAt", "<=", Timestamp.fromDate(localToUtc(endDate, "23:59", timezone)))
      .get(),
  ]);

  // Index recurring slots by day of week: dayOfWeek -> [startMin]
  // Each availability doc is one 30-min slot (matching setup wizard pattern)
  const recurringByDay = new Map<number, Set<number>>();
  // Date-specific additions/blocks indexed by "YYYY-MM-DD"
  const overridesByDate = new Map<string, Array<{ min: number; blocked: boolean }>>();

  for (const doc of availSnap.docs) {
    const d = doc.data();
    if (d.recurring) {
      if (d.blocked) continue;
      const dow = d.dayOfWeek as number;
      if (!recurringByDay.has(dow)) recurringByDay.set(dow, new Set());
      recurringByDay.get(dow)!.add(timeToMinutes(d.startTime));
    } else if (d.specificDate) {
      const dateStr = d.specificDate.toDate().toISOString().split("T")[0];
      if (!overridesByDate.has(dateStr)) overridesByDate.set(dateStr, []);
      overridesByDate.get(dateStr)!.push({
        min: timeToMinutes(d.startTime),
        blocked: d.blocked === true,
      });
    }
  }

  // Index booked lessons by local date
  const bookedByDate = new Map<string, Array<{ startMin: number; endMin: number }>>();
  for (const doc of lessonsSnap.docs) {
    const d = doc.data();
    const local = utcToLocal(d.scheduledAt.toDate(), timezone);
    if (!bookedByDate.has(local.dateStr)) bookedByDate.set(local.dateStr, []);
    bookedByDate.get(local.dateStr)!.push({
      startMin: timeToMinutes(local.time),
      endMin: timeToMinutes(local.time) + d.durationMinutes,
    });
  }

  // "Now" in teacher's timezone (for filtering past slots today)
  const nowLocal = utcToLocal(new Date(), timezone);
  const nowMin = timeToMinutes(nowLocal.time);

  // Process each date in range
  const slots: Array<{ date: string; windows: Array<{ start: string; end: string }> }> = [];
  const cur = new Date(start);

  while (cur <= end) {
    const dateStr = cur.toISOString().split("T")[0];
    const dayOfWeek = cur.getUTCDay(); // 0=Sun

    // Skip past dates
    if (dateStr < nowLocal.dateStr) {
      cur.setUTCDate(cur.getUTCDate() + 1);
      continue;
    }

    // Start with recurring slots for this day of week
    const available = new Set<number>(recurringByDay.get(dayOfWeek) ?? []);

    // Apply date-specific overrides
    const overrides = overridesByDate.get(dateStr) ?? [];
    for (const o of overrides) {
      if (o.blocked) {
        available.delete(o.min);
      } else {
        available.add(o.min);
      }
    }

    // Subtract booked lessons
    const booked = bookedByDate.get(dateStr) ?? [];
    for (const lesson of booked) {
      for (let min = lesson.startMin; min < lesson.endMin; min += 30) {
        available.delete(min);
      }
    }

    // Filter past slots for today
    if (dateStr === nowLocal.dateStr) {
      for (const min of available) {
        if (min <= nowMin) available.delete(min);
      }
    }

    // Build sorted 30-min windows
    if (available.size > 0) {
      const sorted = [...available].sort((a, b) => a - b);
      const windows = sorted.map((min) => ({
        start: minutesToTime(min),
        end: minutesToTime(min + 30),
      }));
      slots.push({ date: dateStr, windows });
    }

    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  return { slots, timezone };
});
```

**Design notes for the implementer:**
- Each availability doc from the setup wizard represents one 30-min slot (startTime to endTime = 30 min). We work with these as individual 30-min units.
- Location filtering is deferred — the PRD's `locationIds` per window is a nice-to-have. For MVP, all slots are returned without location filtering.
- The client combines adjacent 30-min windows to fit longer lesson types.

- [ ] **Step 2: Verify build**

Run: `cd functions && npm run build 2>&1`
Expected: Clean compilation

- [ ] **Step 3: Commit**

```bash
git add functions/src/scheduling/get-available-slots.ts
git commit -m "feat: add getAvailableSlots Cloud Function with slot computation"
```

---

### Task 3: bookLesson Cloud Function

**Files:**
- Create: `functions/src/scheduling/book-lesson.ts`

**Context:** Uses a Firestore transaction for atomicity — checks slot availability, verifies credits, deducts credits, creates lesson + transaction doc. Read `functions/src/utils/timezone.ts` for `localToUtc` and `timeToMinutes`.

- [ ] **Step 1: Create bookLesson function**

```typescript
// functions/src/scheduling/book-lesson.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { localToUtc, timeToMinutes } from "../utils/timezone";

export const bookLesson = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const { teacherId, lessonTypeId, locationId, date, startTime } = request.data ?? {};

  if (!teacherId || !lessonTypeId || !date || !startTime) {
    throw new HttpsError(
      "invalid-argument",
      "teacherId, lessonTypeId, date, and startTime are required"
    );
  }

  const db = getFirestore();
  const uid = request.auth.uid;

  // Get teacher's timezone from availability
  const anyAvail = await db
    .collection("availability")
    .where("teacherId", "==", teacherId)
    .limit(1)
    .get();

  if (anyAvail.empty) {
    throw new HttpsError("failed-precondition", "Teacher has no availability configured");
  }
  const timezone: string = anyAvail.docs[0].data().timezone;

  return db.runTransaction(async (transaction) => {
    // 1. Read lesson type
    const ltRef = db.doc(`lessonTypes/${lessonTypeId}`);
    const ltSnap = await transaction.get(ltRef);
    if (!ltSnap.exists) throw new HttpsError("not-found", "Lesson type not found");
    const lt = ltSnap.data()!;

    if (lt.teacherId !== teacherId) {
      throw new HttpsError("permission-denied", "Lesson type does not belong to this teacher");
    }
    if (!lt.active) {
      throw new HttpsError("failed-precondition", "This lesson type is no longer available");
    }

    // 2. Compute UTC scheduledAt
    const scheduledAtUtc = localToUtc(date, startTime, timezone);
    const scheduledAtTs = Timestamp.fromDate(scheduledAtUtc);
    const endAtUtc = new Date(scheduledAtUtc.getTime() + lt.durationMinutes * 60000);

    // 3. Check for double-booking — get all scheduled lessons for this teacher on this day
    const dayStartUtc = localToUtc(date, "00:00", timezone);
    const dayEndUtc = localToUtc(date, "23:59", timezone);

    const existingSnap = await transaction.get(
      db
        .collection("lessons")
        .where("teacherId", "==", teacherId)
        .where("status", "==", "scheduled")
        .where("scheduledAt", ">=", Timestamp.fromDate(dayStartUtc))
        .where("scheduledAt", "<=", Timestamp.fromDate(dayEndUtc))
    );

    for (const doc of existingSnap.docs) {
      const existing = doc.data();
      const exStart = existing.scheduledAt.toDate().getTime();
      const exEnd = exStart + existing.durationMinutes * 60000;

      if (scheduledAtUtc.getTime() < exEnd && endAtUtc.getTime() > exStart) {
        throw new HttpsError("already-exists", "This time slot is no longer available");
      }
    }

    // 4. Check student credits
    const creditRef = db.doc(`studentCredits/${teacherId}_${uid}`);
    const creditSnap = await transaction.get(creditRef);

    if (!creditSnap.exists) {
      throw new HttpsError("not-found", "No credit balance found with this teacher");
    }

    const balance = creditSnap.data()!.balance as number;
    const cost = lt.creditCost as number;

    if (balance < cost) {
      throw new HttpsError(
        "failed-precondition",
        `Insufficient credits. You have ${balance}, need ${cost}.`
      );
    }

    // 5. Deduct credits
    transaction.update(creditRef, {
      balance: balance - cost,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 6. Create lesson doc
    const lessonRef = db.collection("lessons").doc();
    transaction.set(lessonRef, {
      teacherId,
      studentId: uid,
      lessonTypeId,
      locationId: locationId || null,
      status: "scheduled",
      scheduledAt: scheduledAtTs,
      durationMinutes: lt.durationMinutes,
      creditDeducted: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 7. Create transaction record
    transaction.set(db.collection("transactions").doc(), {
      teacherId,
      studentId: uid,
      type: "credit_deduction",
      credits: -cost,
      lessonId: lessonRef.id,
      description: `Booked: ${lt.name}`,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { success: true, lessonId: lessonRef.id };
  });
});
```

- [ ] **Step 2: Verify build**

Run: `cd functions && npm run build 2>&1`
Expected: Clean compilation

- [ ] **Step 3: Commit**

```bash
git add functions/src/scheduling/book-lesson.ts
git commit -m "feat: add bookLesson Cloud Function with double-booking prevention"
```

---

### Task 4: cancelLesson Cloud Function

**Files:**
- Create: `functions/src/scheduling/cancel-lesson.ts`

**Context:** Enforces the teacher's `cancellationWindowHours` policy. Student cancellation before the window returns credit; within the window forfeits it. Teacher cancellation always returns credit. Uses a Firestore transaction for atomicity.

- [ ] **Step 1: Create cancelLesson function**

```typescript
// functions/src/scheduling/cancel-lesson.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const cancelLesson = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const { lessonId } = request.data ?? {};
  if (!lessonId) {
    throw new HttpsError("invalid-argument", "lessonId is required");
  }

  const db = getFirestore();
  const uid = request.auth.uid;
  const role = request.auth.token.role as string;

  return db.runTransaction(async (transaction) => {
    // 1. Read lesson
    const lessonRef = db.doc(`lessons/${lessonId}`);
    const lessonSnap = await transaction.get(lessonRef);

    if (!lessonSnap.exists) throw new HttpsError("not-found", "Lesson not found");
    const lesson = lessonSnap.data()!;

    // 2. Verify access
    if (role === "teacher" && lesson.teacherId !== uid) {
      throw new HttpsError("permission-denied", "Not your lesson");
    }
    if (role === "student" && lesson.studentId !== uid) {
      throw new HttpsError("permission-denied", "Not your lesson");
    }

    if (lesson.status !== "scheduled") {
      throw new HttpsError("failed-precondition", "Only scheduled lessons can be cancelled");
    }

    // 3. Determine credit return
    const cancelledBy = role as "teacher" | "student";
    let returnCredit = false;

    if (cancelledBy === "teacher") {
      returnCredit = true;
    } else {
      // Student: check cancellation window
      const profileSnap = await transaction.get(
        db.doc(`teacherProfiles/${lesson.teacherId}`)
      );
      const windowHours = profileSnap.data()?.cancellationWindowHours ?? 24;
      const lessonTime = lesson.scheduledAt.toDate().getTime();
      const hoursUntil = (lessonTime - Date.now()) / 3600000;
      returnCredit = hoursUntil >= windowHours;
    }

    // 4. Update lesson status
    const newStatus =
      cancelledBy === "teacher" ? "cancelled_by_teacher" : "cancelled_by_student";

    transaction.update(lessonRef, {
      status: newStatus,
      cancelledAt: FieldValue.serverTimestamp(),
      cancelledBy,
      ...(returnCredit && lesson.creditDeducted
        ? { creditReturnedAt: FieldValue.serverTimestamp() }
        : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 5. Return credit if applicable
    if (returnCredit && lesson.creditDeducted) {
      const ltSnap = await transaction.get(db.doc(`lessonTypes/${lesson.lessonTypeId}`));
      const creditCost = ltSnap.exists ? (ltSnap.data()!.creditCost as number) : 1;

      const creditRef = db.doc(
        `studentCredits/${lesson.teacherId}_${lesson.studentId}`
      );
      const creditSnap = await transaction.get(creditRef);

      if (creditSnap.exists) {
        transaction.update(creditRef, {
          balance: (creditSnap.data()!.balance || 0) + creditCost,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      transaction.set(db.collection("transactions").doc(), {
        teacherId: lesson.teacherId,
        studentId: lesson.studentId,
        type: "credit_return",
        credits: creditCost,
        lessonId,
        description: `Cancelled: credit returned`,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    return { success: true, creditReturned: returnCredit };
  });
});
```

- [ ] **Step 2: Verify build**

Run: `cd functions && npm run build 2>&1`
Expected: Clean compilation

- [ ] **Step 3: Commit**

```bash
git add functions/src/scheduling/cancel-lesson.ts
git commit -m "feat: add cancelLesson Cloud Function with policy enforcement"
```

---

### Task 5: completeLesson + markNoShow + Export All Functions

**Files:**
- Create: `functions/src/scheduling/complete-lesson.ts`
- Create: `functions/src/scheduling/mark-no-show.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Create completeLesson function**

```typescript
// functions/src/scheduling/complete-lesson.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const completeLesson = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in");
  if (request.auth.token.role !== "teacher") {
    throw new HttpsError("permission-denied", "Only teachers can complete lessons");
  }

  const { lessonId, notes } = request.data ?? {};
  if (!lessonId) throw new HttpsError("invalid-argument", "lessonId is required");

  const db = getFirestore();
  const uid = request.auth.uid;
  const lessonRef = db.doc(`lessons/${lessonId}`);
  const lessonSnap = await lessonRef.get();

  if (!lessonSnap.exists) throw new HttpsError("not-found", "Lesson not found");
  const lesson = lessonSnap.data()!;

  if (lesson.teacherId !== uid) throw new HttpsError("permission-denied", "Not your lesson");
  if (lesson.status !== "scheduled") {
    throw new HttpsError("failed-precondition", "Only scheduled lessons can be completed");
  }

  await lessonRef.update({
    status: "completed",
    ...(notes ? { notes } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
});
```

- [ ] **Step 2: Create markNoShow function**

```typescript
// functions/src/scheduling/mark-no-show.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const markNoShow = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in");
  if (request.auth.token.role !== "teacher") {
    throw new HttpsError("permission-denied", "Only teachers can mark no-shows");
  }

  const { lessonId } = request.data ?? {};
  if (!lessonId) throw new HttpsError("invalid-argument", "lessonId is required");

  const db = getFirestore();
  const uid = request.auth.uid;
  const lessonRef = db.doc(`lessons/${lessonId}`);
  const lessonSnap = await lessonRef.get();

  if (!lessonSnap.exists) throw new HttpsError("not-found", "Lesson not found");
  const lesson = lessonSnap.data()!;

  if (lesson.teacherId !== uid) throw new HttpsError("permission-denied", "Not your lesson");
  if (lesson.status !== "scheduled") {
    throw new HttpsError("failed-precondition", "Only scheduled lessons can be marked no-show");
  }

  // Validate lesson time has passed
  const lessonEnd =
    lesson.scheduledAt.toDate().getTime() + lesson.durationMinutes * 60000;
  if (Date.now() < lessonEnd) {
    throw new HttpsError(
      "failed-precondition",
      "Cannot mark no-show before the lesson time has passed"
    );
  }

  await lessonRef.update({
    status: "no_show",
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
});
```

- [ ] **Step 3: Export all new functions from index.ts**

Add these lines to the end of `functions/src/index.ts`:

```typescript
export { getAvailableSlots } from "./scheduling/get-available-slots";
export { bookLesson } from "./scheduling/book-lesson";
export { cancelLesson } from "./scheduling/cancel-lesson";
export { completeLesson } from "./scheduling/complete-lesson";
export { markNoShow } from "./scheduling/mark-no-show";
```

- [ ] **Step 4: Verify build**

Run: `cd functions && npm run build 2>&1`
Expected: Clean compilation

- [ ] **Step 5: Commit**

```bash
git add functions/src/scheduling/complete-lesson.ts functions/src/scheduling/mark-no-show.ts functions/src/index.ts
git commit -m "feat: add completeLesson and markNoShow, export all scheduling functions"
```

---

### Task 6: Client-Side Time Utilities

**Files:**
- Create: `src/lib/time-utils.ts`

- [ ] **Step 1: Create time-utils module**

```typescript
// src/lib/time-utils.ts

/** "HH:mm" -> "3:00 PM" */
export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

/** "YYYY-MM-DD" -> "Thursday, June 12, 2026" */
export function formatLongDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00"); // noon avoids timezone shift
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** "YYYY-MM-DD" -> { dayName: "Thu", dayNum: 12, month: "Jun" } */
export function formatShortDate(dateStr: string): {
  dayName: string;
  dayNum: number;
  month: string;
} {
  const date = new Date(dateStr + "T12:00:00");
  return {
    dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
    dayNum: date.getDate(),
    month: date.toLocaleDateString("en-US", { month: "short" }),
  };
}

/** Duration minutes -> "30 min", "1 hr", "1 hr 30 min" */
export function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return hrs === 1 ? "1 hr" : `${hrs} hrs`;
  return `${hrs} hr ${mins} min`;
}

/** Cents -> "$50.00" */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** IANA timezone -> short label like "EDT", "PST" */
export function formatTimezone(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "short",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value || tz;
  } catch {
    return tz;
  }
}

/** "HH:mm" + durationMinutes -> end time "HH:mm" */
export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60);
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

/** Generate "YYYY-MM-DD" for next N days starting from today */
export function nextNDays(n: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}
```

- [ ] **Step 2: Verify frontend build**

Run: `npm run build 2>&1`
Expected: Successful build

- [ ] **Step 3: Commit**

```bash
git add src/lib/time-utils.ts
git commit -m "feat: add client-side time formatting utilities"
```

---

### Task 7: Teacher Availability Page

**Files:**
- Modify: `src/components/setup/availability-grid.tsx` (add `submitLabel` prop)
- Create: `src/components/availability/override-form.tsx`
- Create: `src/components/availability/override-list.tsx`
- Create: `src/pages/teacher/availability.tsx`

**Context:** Read `src/components/setup/availability-grid.tsx` for the existing grid component. Read `src/pages/teacher/setup.tsx:229-273` for how the setup wizard saves availability (individual 30-min docs using `addDoc`). The availability page follows the same save pattern.

- [ ] **Step 1: Add `submitLabel` prop to AvailabilityGrid**

In `src/components/setup/availability-grid.tsx`, update the `AvailabilityGridProps` interface to add:

```typescript
submitLabel?: string;
```

Then change line 217 from:

```typescript
{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finish"}
```

to:

```typescript
{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (submitLabel ?? "Finish")}
```

- [ ] **Step 2: Create override-form component**

```typescript
// src/components/availability/override-form.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

interface OverrideFormProps {
  onSave: (data: {
    date: string;
    startTime: string;
    endTime: string;
    blocked: boolean;
  }) => Promise<void>;
  onCancel: () => void;
}

export function OverrideForm({ onSave, onCancel }: OverrideFormProps) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [blocked, setBlocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const handleSubmit = async () => {
    if (!date) {
      setError("Date is required");
      return;
    }
    if (date < today) {
      setError("Date must be today or future");
      return;
    }
    if (startTime >= endTime) {
      setError("End time must be after start time");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSave({ date, startTime, endTime, blocked });
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-brand-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={today} />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Switch checked={blocked} onCheckedChange={setBlocked} />
          <Label>{blocked ? "Blocked (time off)" : "Available (extra hours)"}</Label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Start time</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} step="1800" />
        </div>
        <div>
          <Label>End time</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} step="1800" />
        </div>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving} className="bg-accent-500 hover:bg-accent-600">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create override-list component**

```typescript
// src/components/availability/override-list.tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { formatTime } from "@/lib/time-utils";
import type { Availability } from "@/types";

interface OverrideWithId {
  id: string;
  data: Availability;
}

interface OverrideListProps {
  overrides: OverrideWithId[];
  onDelete: (id: string) => Promise<void>;
}

export function OverrideList({ overrides, onDelete }: OverrideListProps) {
  if (overrides.length === 0) {
    return <p className="text-sm text-brand-400">No upcoming overrides</p>;
  }

  return (
    <div className="space-y-2">
      {overrides.map((o) => {
        const date = o.data.specificDate?.toDate();
        const dateLabel = date
          ? date.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })
          : "Unknown";

        return (
          <div
            key={o.id}
            className="flex items-center justify-between rounded-lg border border-brand-200 px-4 py-3"
          >
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-brand-700">{dateLabel}</span>
              <span className="text-sm text-brand-500">
                {formatTime(o.data.startTime)} - {formatTime(o.data.endTime)}
              </span>
              <Badge variant={o.data.blocked ? "secondary" : "default"}>
                {o.data.blocked ? "Blocked" : "Available"}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(o.id)}
              className="text-brand-400 hover:text-error"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Create teacher availability page**

```typescript
// src/pages/teacher/availability.tsx
import { useCallback, useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { AvailabilityGrid, slotKey, endTime } from "@/components/setup/availability-grid";
import { OverrideForm } from "@/components/availability/override-form";
import { OverrideList } from "@/components/availability/override-list";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Availability } from "@/types";

interface OverrideWithId {
  id: string;
  data: Availability;
}

export default function AvailabilityPage() {
  const { firebaseUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [savedSlots, setSavedSlots] = useState<Set<string>>(new Set());
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [overrides, setOverrides] = useState<OverrideWithId[]>([]);
  const [showOverrideForm, setShowOverrideForm] = useState(false);

  const isDirty =
    selectedSlots.size !== savedSlots.size ||
    [...selectedSlots].some((s) => !savedSlots.has(s));

  // Load existing data
  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    const load = async () => {
      const snap = await getDocs(
        query(collection(db, "availability"), where("teacherId", "==", uid))
      );

      const slots = new Set<string>();
      const overrideList: OverrideWithId[] = [];

      snap.docs.forEach((d) => {
        const data = d.data() as Availability;
        if (data.recurring && !data.blocked && data.dayOfWeek != null) {
          slots.add(slotKey(data.dayOfWeek, data.startTime));
          if (data.timezone) setTimezone(data.timezone);
        } else if (!data.recurring && data.specificDate) {
          overrideList.push({ id: d.id, data });
        }
      });

      // Sort overrides by date
      overrideList.sort((a, b) => {
        const aTime = a.data.specificDate?.toMillis() ?? 0;
        const bTime = b.data.specificDate?.toMillis() ?? 0;
        return aTime - bTime;
      });

      setSelectedSlots(slots);
      setSavedSlots(new Set(slots));
      setOverrides(overrideList);
      setLoading(false);
    };

    load();
  }, [firebaseUser]);

  // Save weekly schedule
  const handleSave = useCallback(async () => {
    if (!firebaseUser) return;
    setSaving(true);
    try {
      const uid = firebaseUser.uid;

      // Delete existing recurring slots
      const existingSnap = await getDocs(
        query(
          collection(db, "availability"),
          where("teacherId", "==", uid),
          where("recurring", "==", true)
        )
      );
      await Promise.all(existingSnap.docs.map((d) => deleteDoc(d.ref)));

      // Write new slots
      await Promise.all(
        Array.from(selectedSlots).map((key) => {
          const [dayStr, time] = key.split("-");
          return addDoc(collection(db, "availability"), {
            teacherId: uid,
            dayOfWeek: Number(dayStr),
            startTime: time,
            endTime: endTime(time),
            timezone,
            recurring: true,
            blocked: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        })
      );

      setSavedSlots(new Set(selectedSlots));
      toast.success("Schedule saved");
    } catch {
      toast.error("Failed to save schedule");
    } finally {
      setSaving(false);
    }
  }, [firebaseUser, selectedSlots, timezone]);

  // Discard changes
  const handleDiscard = () => {
    setSelectedSlots(new Set(savedSlots));
  };

  // Add override
  const handleAddOverride = useCallback(
    async (data: { date: string; startTime: string; endTime: string; blocked: boolean }) => {
      if (!firebaseUser) return;

      // Create 30-min slot docs for the override range
      const uid = firebaseUser.uid;
      const startMin = parseInt(data.startTime.split(":")[0]) * 60 + parseInt(data.startTime.split(":")[1]);
      const endMin = parseInt(data.endTime.split(":")[0]) * 60 + parseInt(data.endTime.split(":")[1]);
      const specificDate = Timestamp.fromDate(new Date(data.date + "T00:00:00Z"));

      const newDocs: OverrideWithId[] = [];

      for (let min = startMin; min < endMin; min += 30) {
        const h = Math.floor(min / 60);
        const m = min % 60;
        const st = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        const et30 = min + 30;
        const eh = Math.floor(et30 / 60);
        const em = et30 % 60;
        const et = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;

        const docRef = await addDoc(collection(db, "availability"), {
          teacherId: uid,
          dayOfWeek: null,
          startTime: st,
          endTime: et,
          timezone,
          recurring: false,
          specificDate,
          blocked: data.blocked,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        newDocs.push({
          id: docRef.id,
          data: {
            teacherId: uid,
            dayOfWeek: null,
            startTime: st,
            endTime: et,
            timezone,
            recurring: false,
            specificDate,
            blocked: data.blocked,
          } as Availability,
        });
      }

      setOverrides((prev) =>
        [...prev, ...newDocs].sort((a, b) => {
          const aTime = a.data.specificDate?.toMillis() ?? 0;
          const bTime = b.data.specificDate?.toMillis() ?? 0;
          return aTime - bTime;
        })
      );
      setShowOverrideForm(false);
      toast.success(data.blocked ? "Time blocked" : "Override added");
    },
    [firebaseUser, timezone]
  );

  // Delete override
  const handleDeleteOverride = useCallback(async (id: string) => {
    await deleteDoc(doc(db, "availability", id));
    setOverrides((prev) => prev.filter((o) => o.id !== id));
    toast.success("Override removed");
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <h1 className="text-2xl font-bold text-brand-800">Availability</h1>

      {/* Weekly Schedule */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-700">Weekly Schedule</h2>
          {isDirty && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-amber-600">Unsaved changes</span>
              <Button variant="ghost" size="sm" onClick={handleDiscard}>
                Discard
              </Button>
            </div>
          )}
        </div>

        <AvailabilityGrid
          value={selectedSlots}
          onChange={setSelectedSlots}
          onSubmit={handleSave}
          onBack={handleDiscard}
          submitting={saving}
          timezone={timezone}
          submitLabel="Save Schedule"
        />
      </section>

      {/* Overrides */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-700">Upcoming Overrides</h2>
          {!showOverrideForm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOverrideForm(true)}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Override
            </Button>
          )}
        </div>

        {showOverrideForm && (
          <OverrideForm
            onSave={handleAddOverride}
            onCancel={() => setShowOverrideForm(false)}
          />
        )}

        <OverrideList overrides={overrides} onDelete={handleDeleteOverride} />
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build 2>&1`
Expected: Successful build

- [ ] **Step 6: Commit**

```bash
git add src/components/setup/availability-grid.tsx src/components/availability/ src/pages/teacher/availability.tsx
git commit -m "feat: add teacher availability management with weekly grid and overrides"
```

---

### Task 8: Student Booking Page

**Files:**
- Create: `src/components/booking/lesson-type-picker.tsx`
- Create: `src/components/booking/date-slot-picker.tsx`
- Create: `src/components/booking/booking-confirm.tsx`
- Create: `src/pages/student/book.tsx`

**Context:** Read `src/lib/time-utils.ts` for formatting helpers. Read `src/lib/firebase.ts` — it exports `db` as named and `app` as default. Cloud Functions are called via `getFunctions(app)` + `httpsCallable`. Read `src/types/index.ts` for `LessonType`.

- [ ] **Step 1: Create lesson-type-picker component**

```typescript
// src/components/booking/lesson-type-picker.tsx
import { Card, CardContent } from "@/components/ui/card";
import { formatDuration, formatPrice } from "@/lib/time-utils";
import { cn } from "@/lib/utils";
import type { LessonType } from "@/types";

interface LessonTypeWithId {
  id: string;
  data: LessonType;
}

interface LessonTypePickerProps {
  lessonTypes: LessonTypeWithId[];
  selected: string | null;
  onSelect: (id: string) => void;
}

export function LessonTypePicker({ lessonTypes, selected, onSelect }: LessonTypePickerProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-brand-700">Choose a Lesson Type</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {lessonTypes.map((lt) => (
          <Card
            key={lt.id}
            className={cn(
              "cursor-pointer transition-all",
              selected === lt.id
                ? "border-accent-500 ring-2 ring-accent-200"
                : "hover:border-brand-300"
            )}
            onClick={() => onSelect(lt.id)}
          >
            <CardContent className="p-4">
              <p className="font-semibold text-brand-800">{lt.data.name}</p>
              <div className="mt-2 flex items-center gap-3 text-sm text-brand-500">
                <span>{formatDuration(lt.data.durationMinutes)}</span>
                <span>{formatPrice(lt.data.priceAmount)}</span>
                <span>
                  {lt.data.creditCost} credit{lt.data.creditCost !== 1 ? "s" : ""}
                </span>
              </div>
              {lt.data.description && (
                <p className="mt-2 text-sm text-brand-400">{lt.data.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create date-slot-picker component**

```typescript
// src/components/booking/date-slot-picker.tsx
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatTime, formatShortDate, addMinutesToTime, nextNDays, formatTimezone } from "@/lib/time-utils";

interface SlotWindow {
  start: string;
  end: string;
}

interface DaySlots {
  date: string;
  windows: SlotWindow[];
}

interface DateSlotPickerProps {
  slots: DaySlots[];
  timezone: string;
  durationMinutes: number;
  onSelect: (date: string, startTime: string) => void;
  onBack: () => void;
}

export function DateSlotPicker({
  slots,
  timezone,
  durationMinutes,
  onSelect,
  onBack,
}: DateSlotPickerProps) {
  const dates = useMemo(() => nextNDays(30), []);
  const availableDates = useMemo(
    () => new Set(slots.map((s) => s.date)),
    [slots]
  );

  const [selectedDate, setSelectedDate] = useState<string>(
    slots[0]?.date ?? dates[0]
  );

  // Get windows for selected date
  const dayWindows = useMemo(
    () => slots.find((s) => s.date === selectedDate)?.windows ?? [],
    [slots, selectedDate]
  );

  // Find valid start times based on lesson duration
  const requiredSlots = Math.ceil(durationMinutes / 30);
  const validStarts = useMemo(() => {
    const starts: Array<{ start: string; end: string }> = [];
    for (let i = 0; i <= dayWindows.length - requiredSlots; i++) {
      let consecutive = true;
      for (let j = 1; j < requiredSlots; j++) {
        if (dayWindows[i + j - 1].end !== dayWindows[i + j].start) {
          consecutive = false;
          break;
        }
      }
      if (consecutive) {
        starts.push({
          start: dayWindows[i].start,
          end: addMinutesToTime(dayWindows[i].start, durationMinutes),
        });
      }
    }
    return starts;
  }, [dayWindows, requiredSlots, durationMinutes]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-700">Pick a Date & Time</h2>
        <span className="text-sm text-brand-400">{formatTimezone(timezone)}</span>
      </div>

      {/* Date strip */}
      <div className="flex gap-1.5 overflow-x-auto pb-2">
        {dates.map((dateStr) => {
          const hasSlots = availableDates.has(dateStr);
          const isSelected = dateStr === selectedDate;
          const { dayName, dayNum } = formatShortDate(dateStr);

          return (
            <button
              key={dateStr}
              onClick={() => hasSlots && setSelectedDate(dateStr)}
              disabled={!hasSlots}
              className={cn(
                "flex min-w-[52px] flex-col items-center rounded-lg px-2 py-2 text-sm transition-colors",
                isSelected && "bg-accent-500 text-white",
                hasSlots && !isSelected && "hover:bg-brand-100 text-brand-700",
                !hasSlots && "text-brand-300 cursor-not-allowed"
              )}
            >
              <span className="text-xs">{dayName}</span>
              <span className="text-base font-semibold">{dayNum}</span>
            </button>
          );
        })}
      </div>

      {/* Slot list */}
      {validStarts.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-3">
          {validStarts.map((slot) => (
            <Button
              key={slot.start}
              variant="outline"
              className="justify-start"
              onClick={() => onSelect(selectedDate, slot.start)}
            >
              {formatTime(slot.start)} - {formatTime(slot.end)}
            </Button>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-brand-400">
          No times available on this day
        </p>
      )}

      <Button variant="ghost" onClick={onBack}>
        Back
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Create booking-confirm component**

```typescript
// src/components/booking/booking-confirm.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { formatTime, formatLongDate, formatDuration, formatTimezone } from "@/lib/time-utils";
import type { LessonType } from "@/types";

interface BookingConfirmProps {
  lessonType: LessonType;
  date: string;
  startTime: string;
  timezone: string;
  creditBalance: number;
  onConfirm: () => Promise<void>;
  onBack: () => void;
  confirming: boolean;
}

export function BookingConfirm({
  lessonType,
  date,
  startTime,
  timezone,
  creditBalance,
  onConfirm,
  onBack,
  confirming,
}: BookingConfirmProps) {
  const endH = parseInt(startTime.split(":")[0]) * 60 + parseInt(startTime.split(":")[1]) + lessonType.durationMinutes;
  const endTime = `${String(Math.floor(endH / 60)).padStart(2, "0")}:${String(endH % 60).padStart(2, "0")}`;
  const sufficient = creditBalance >= lessonType.creditCost;
  const remaining = creditBalance - lessonType.creditCost;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-brand-700">Confirm Booking</h2>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex justify-between">
            <span className="text-brand-500">Lesson</span>
            <span className="font-medium text-brand-800">{lessonType.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-brand-500">Date</span>
            <span className="font-medium text-brand-800">{formatLongDate(date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-brand-500">Time</span>
            <span className="font-medium text-brand-800">
              {formatTime(startTime)} - {formatTime(endTime)} ({formatTimezone(timezone)})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-brand-500">Duration</span>
            <span className="font-medium text-brand-800">
              {formatDuration(lessonType.durationMinutes)}
            </span>
          </div>

          <hr className="border-brand-200" />

          <div className="flex justify-between">
            <span className="text-brand-500">Credit cost</span>
            <span className="font-medium text-brand-800">
              {lessonType.creditCost} credit{lessonType.creditCost !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-brand-500">Your balance</span>
            <span className="font-medium text-brand-800">
              {creditBalance} credit{creditBalance !== 1 ? "s" : ""}
            </span>
          </div>
          {sufficient && (
            <div className="flex justify-between">
              <span className="text-brand-500">After booking</span>
              <span className="font-medium text-brand-800">
                {remaining} credit{remaining !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {!sufficient && (
        <Badge variant="destructive" className="w-full justify-center py-2">
          You need {lessonType.creditCost - creditBalance} more credit
          {lessonType.creditCost - creditBalance !== 1 ? "s" : ""} to book this lesson
        </Badge>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={onConfirm}
          disabled={!sufficient || confirming}
          className="bg-accent-500 hover:bg-accent-600"
        >
          {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Booking"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create student booking page**

```typescript
// src/pages/student/book.tsx
import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "@/lib/firebase";
import app from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { LessonTypePicker } from "@/components/booking/lesson-type-picker";
import { DateSlotPicker } from "@/components/booking/date-slot-picker";
import { BookingConfirm } from "@/components/booking/booking-confirm";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { LessonType } from "@/types";

interface LessonTypeWithId {
  id: string;
  data: LessonType;
}

interface DaySlots {
  date: string;
  windows: Array<{ start: string; end: string }>;
}

export default function BookPage() {
  const { teacherSlug } = useParams<{ teacherSlug: string }>();
  const navigate = useNavigate();
  const { firebaseUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [lessonTypes, setLessonTypes] = useState<LessonTypeWithId[]>([]);
  const [slots, setSlots] = useState<DaySlots[]>([]);
  const [timezone, setTimezone] = useState("");
  const [creditBalance, setCreditBalance] = useState(0);

  // Step state
  const [step, setStep] = useState(1);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [confirming, setConfirming] = useState(false);

  const selectedType = lessonTypes.find((lt) => lt.id === selectedTypeId);

  // Load teacher + lesson types + slots + credit balance
  useEffect(() => {
    if (!firebaseUser || !teacherSlug) return;

    const load = async () => {
      try {
        // Resolve slug to teacherId
        const profilesSnap = await getDocs(
          query(collection(db, "teacherProfiles"), where("slug", "==", teacherSlug))
        );

        if (profilesSnap.empty) {
          setError("Teacher not found");
          setLoading(false);
          return;
        }

        const tId = profilesSnap.docs[0].id;
        setTeacherId(tId);

        // Get teacher name
        const userSnap = await getDoc(doc(db, "users", tId));
        setTeacherName(userSnap.data()?.displayName ?? "Your Teacher");

        // Load lesson types, slots, and credits in parallel
        const functions = getFunctions(app);
        const getSlotsFn = httpsCallable(functions, "getAvailableSlots");

        const today = new Date().toISOString().split("T")[0];
        const endDate = new Date(Date.now() + 29 * 86400000).toISOString().split("T")[0];

        const [ltSnap, slotsRes, creditSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, "lessonTypes"),
              where("teacherId", "==", tId),
              where("active", "==", true)
            )
          ),
          getSlotsFn({ teacherId: tId, startDate: today, endDate }),
          getDoc(doc(db, "studentCredits", `${tId}_${firebaseUser.uid}`)),
        ]);

        setLessonTypes(
          ltSnap.docs
            .map((d) => ({ id: d.id, data: d.data() as LessonType }))
            .filter((lt) => !lt.data.isGroup)
        );

        const slotsData = slotsRes.data as {
          slots: DaySlots[];
          timezone: string;
        };
        setSlots(slotsData.slots);
        setTimezone(slotsData.timezone);

        setCreditBalance(creditSnap.exists() ? (creditSnap.data()?.balance ?? 0) : 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load booking data");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [firebaseUser, teacherSlug]);

  // Step 1: Select lesson type
  const handleSelectType = (id: string) => {
    setSelectedTypeId(id);
    setStep(2);
  };

  // Step 2: Select date/time
  const handleSelectSlot = (date: string, startTime: string) => {
    setSelectedDate(date);
    setSelectedTime(startTime);
    setStep(3);
  };

  // Step 3: Confirm booking
  const handleConfirm = useCallback(async () => {
    if (!selectedType || !selectedDate || !selectedTime) return;
    setConfirming(true);
    try {
      const functions = getFunctions(app);
      const bookFn = httpsCallable(functions, "bookLesson");
      await bookFn({
        teacherId,
        lessonTypeId: selectedTypeId,
        locationId: null,
        date: selectedDate,
        startTime: selectedTime,
      });
      toast.success("Lesson booked!");
      navigate("/home");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Booking failed";
      toast.error(message);
    } finally {
      setConfirming(false);
    }
  }, [teacherId, selectedTypeId, selectedType, selectedDate, selectedTime, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-brand-500">{error}</p>
        <Button variant="ghost" onClick={() => navigate("/home")}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-50">
      <div className="mx-auto max-w-xl px-4 py-8">
        <button
          onClick={() => (step > 1 ? setStep(step - 1) : navigate("/home"))}
          className="mb-4 flex items-center gap-1 text-sm text-brand-500 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {step > 1 ? "Back" : "Home"}
        </button>

        <h1 className="text-2xl font-bold text-brand-800">Book with {teacherName}</h1>

        <div className="mt-2 mb-6 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full",
                s <= step ? "bg-accent-500" : "bg-brand-200"
              )}
            />
          ))}
        </div>

        <div className="mt-6">
          {step === 1 && (
            <LessonTypePicker
              lessonTypes={lessonTypes}
              selected={selectedTypeId}
              onSelect={handleSelectType}
            />
          )}

          {step === 2 && selectedType && (
            <DateSlotPicker
              slots={slots}
              timezone={timezone}
              durationMinutes={selectedType.data.durationMinutes}
              onSelect={handleSelectSlot}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && selectedType && (
            <BookingConfirm
              lessonType={selectedType.data}
              date={selectedDate}
              startTime={selectedTime}
              timezone={timezone}
              creditBalance={creditBalance}
              onConfirm={handleConfirm}
              onBack={() => setStep(2)}
              confirming={confirming}
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

**Note for implementer:** The `BookPage` uses `cn` from `@/lib/utils` for the step indicator — add the import. The page is rendered outside the AppShell (no sidebar needed for students during booking). Route it as a public-ish authenticated route.

- [ ] **Step 5: Verify build**

Run: `npm run build 2>&1`
Expected: Successful build (may have minor type issues to fix)

- [ ] **Step 6: Commit**

```bash
git add src/components/booking/ src/pages/student/book.tsx
git commit -m "feat: add student 3-step booking flow with slot picker"
```

---

### Task 9: Teacher Schedule View

**Files:**
- Create: `src/components/schedule/lesson-card.tsx`
- Create: `src/components/schedule/lesson-actions.tsx`
- Create: `src/pages/teacher/schedule.tsx`

**Context:** Read `src/lib/time-utils.ts` for `formatTime`, `formatLongDate`. Read `src/types/index.ts` for `Lesson`, `LessonStatus`. The schedule page shows a week at a time with lessons grouped by date.

- [ ] **Step 1: Create lesson-card component**

```typescript
// src/components/schedule/lesson-card.tsx
import { Badge } from "@/components/ui/badge";
import { formatTime, formatDuration } from "@/lib/time-utils";
import { cn } from "@/lib/utils";
import type { LessonStatus } from "@/types";

const statusConfig: Record<LessonStatus, { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700" },
  cancelled_by_student: { label: "Cancelled", className: "bg-gray-100 text-gray-600" },
  cancelled_by_teacher: { label: "Cancelled", className: "bg-gray-100 text-gray-600" },
  no_show: { label: "No Show", className: "bg-red-100 text-red-700" },
};

interface LessonCardProps {
  startTime: string; // "HH:mm"
  durationMinutes: number;
  studentName: string;
  lessonTypeName: string;
  status: LessonStatus;
  onClick?: () => void;
}

export function LessonCard({
  startTime,
  durationMinutes,
  studentName,
  lessonTypeName,
  status,
  onClick,
}: LessonCardProps) {
  const endH = parseInt(startTime.split(":")[0]) * 60 + parseInt(startTime.split(":")[1]) + durationMinutes;
  const endTime = `${String(Math.floor(endH / 60)).padStart(2, "0")}:${String(endH % 60).padStart(2, "0")}`;
  const cfg = statusConfig[status];

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border border-brand-200 bg-white px-4 py-3 text-left transition-colors",
        onClick && "hover:border-brand-300 cursor-pointer"
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-brand-800">{studentName}</p>
          <p className="text-sm text-brand-500">
            {formatTime(startTime)} - {formatTime(endTime)} &middot; {lessonTypeName} &middot;{" "}
            {formatDuration(durationMinutes)}
          </p>
        </div>
        <Badge className={cfg.className}>{cfg.label}</Badge>
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Create lesson-actions component**

```typescript
// src/components/schedule/lesson-actions.tsx
import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import app from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface LessonActionsProps {
  lessonId: string;
  status: string;
  scheduledAt: Date;
  durationMinutes: number;
  onAction: () => void; // refresh parent
}

export function LessonActions({
  lessonId,
  status,
  scheduledAt,
  durationMinutes,
  onAction,
}: LessonActionsProps) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState("");

  const lessonEndTime = scheduledAt.getTime() + durationMinutes * 60000;
  const isPast = Date.now() >= lessonEndTime;

  if (status !== "scheduled") return null;

  const callFunction = async (fnName: string, data: Record<string, unknown>) => {
    setLoading(fnName);
    try {
      const functions = getFunctions(app);
      const fn = httpsCallable(functions, fnName);
      await fn(data);
      toast.success(
        fnName === "completeLesson"
          ? "Lesson completed"
          : fnName === "cancelLesson"
            ? "Lesson cancelled"
            : "Marked as no-show"
      );
      onAction();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading("");
    }
  };

  return (
    <div className="mt-3 space-y-3 border-t border-brand-100 pt-3">
      {isPast && (
        <div className="space-y-2">
          <Textarea
            placeholder="Add lesson notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {isPast && (
          <>
            <Button
              size="sm"
              onClick={() =>
                callFunction("completeLesson", { lessonId, ...(notes ? { notes } : {}) })
              }
              disabled={!!loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading === "completeLesson" ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-1 h-4 w-4" />
              )}
              Complete
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => callFunction("markNoShow", { lessonId })}
              disabled={!!loading}
              className="text-red-600 hover:bg-red-50"
            >
              {loading === "markNoShow" ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="mr-1 h-4 w-4" />
              )}
              No Show
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => callFunction("cancelLesson", { lessonId })}
          disabled={!!loading}
        >
          {loading === "cancelLesson" ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="mr-1 h-4 w-4" />
          )}
          Cancel
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create teacher schedule page**

```typescript
// src/pages/teacher/schedule.tsx
import { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { LessonCard } from "@/components/schedule/lesson-card";
import { LessonActions } from "@/components/schedule/lesson-actions";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatLongDate } from "@/lib/time-utils";
import type { Lesson, LessonType } from "@/types";

interface LessonWithMeta {
  id: string;
  data: Lesson;
  studentName: string;
  lessonTypeName: string;
  localTime: string; // "HH:mm"
  localDate: string; // "YYYY-MM-DD"
}

function getWeekBounds(offset: number): { start: Date; end: Date; label: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + offset * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const label = `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${sunday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  return { start: monday, end: sunday, label };
}

export default function SchedulePage() {
  const { firebaseUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [lessons, setLessons] = useState<LessonWithMeta[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { start, end, label } = getWeekBounds(weekOffset);

  const loadLessons = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);

    const snap = await getDocs(
      query(
        collection(db, "lessons"),
        where("teacherId", "==", firebaseUser.uid),
        where("scheduledAt", ">=", Timestamp.fromDate(start)),
        where("scheduledAt", "<=", Timestamp.fromDate(end))
      )
    );

    // Fetch student names and lesson type names
    const studentCache = new Map<string, string>();
    const ltCache = new Map<string, string>();

    const items: LessonWithMeta[] = [];

    for (const d of snap.docs) {
      const data = d.data() as Lesson;

      // Student name
      if (!studentCache.has(data.studentId)) {
        const userSnap = await getDoc(doc(db, "users", data.studentId));
        studentCache.set(data.studentId, userSnap.data()?.displayName ?? "Student");
      }

      // Lesson type name
      if (!ltCache.has(data.lessonTypeId)) {
        const ltSnap = await getDoc(doc(db, "lessonTypes", data.lessonTypeId));
        ltCache.set(data.lessonTypeId, ltSnap.data()?.name ?? "Lesson");
      }

      // Convert scheduledAt to local time
      const at = data.scheduledAt.toDate();
      const localDate = at.toISOString().split("T")[0];
      const localTime = `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;

      items.push({
        id: d.id,
        data,
        studentName: studentCache.get(data.studentId)!,
        lessonTypeName: ltCache.get(data.lessonTypeId)!,
        localTime,
        localDate,
      });
    }

    // Sort by scheduledAt
    items.sort((a, b) => a.data.scheduledAt.toMillis() - b.data.scheduledAt.toMillis());
    setLessons(items);
    setLoading(false);
  }, [firebaseUser, start, end]);

  useEffect(() => {
    loadLessons();
  }, [loadLessons]);

  // Group lessons by date
  const grouped = new Map<string, LessonWithMeta[]>();
  for (const lesson of lessons) {
    if (!grouped.has(lesson.localDate)) grouped.set(lesson.localDate, []);
    grouped.get(lesson.localDate)!.push(lesson);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-brand-800">Schedule</h1>

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setWeekOffset((w) => w - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-brand-700">{label}</span>
        <Button variant="ghost" size="sm" onClick={() => setWeekOffset((w) => w + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
        </div>
      ) : lessons.length === 0 ? (
        <p className="py-12 text-center text-brand-400">No lessons this week</p>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([date, dayLessons]) => (
            <div key={date}>
              <h3 className="mb-2 text-sm font-semibold text-brand-500">
                {formatLongDate(date)}
              </h3>
              <div className="space-y-2">
                {dayLessons.map((lesson) => (
                  <div key={lesson.id}>
                    <LessonCard
                      startTime={lesson.localTime}
                      durationMinutes={lesson.data.durationMinutes}
                      studentName={lesson.studentName}
                      lessonTypeName={lesson.lessonTypeName}
                      status={lesson.data.status}
                      onClick={() =>
                        setExpandedId(expandedId === lesson.id ? null : lesson.id)
                      }
                    />
                    {expandedId === lesson.id && (
                      <LessonActions
                        lessonId={lesson.id}
                        status={lesson.data.status}
                        scheduledAt={lesson.data.scheduledAt.toDate()}
                        durationMinutes={lesson.data.durationMinutes}
                        onAction={loadLessons}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build 2>&1`
Expected: Successful build

- [ ] **Step 5: Commit**

```bash
git add src/components/schedule/ src/pages/teacher/schedule.tsx
git commit -m "feat: add teacher schedule view with lesson actions"
```

---

### Task 10: Student Home Page Update

**Files:**
- Modify: `src/pages/student/home.tsx` (complete rewrite)

**Context:** Read current `src/pages/student/home.tsx` — it's a placeholder. Read `src/types/index.ts` for `TeacherStudent`, `Lesson`. Read `src/lib/time-utils.ts` for formatting. The updated page shows connected teachers with "Book Lesson" links + upcoming lessons with cancel buttons.

- [ ] **Step 1: Rewrite student home page**

```typescript
// src/pages/student/home.tsx
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "@/lib/firebase";
import app from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, XCircle } from "lucide-react";
import { formatTime, formatLongDate, formatDuration } from "@/lib/time-utils";
import { toast } from "sonner";
import type { Lesson } from "@/types";

interface TeacherInfo {
  id: string;
  displayName: string;
  slug: string;
}

interface UpcomingLesson {
  id: string;
  data: Lesson;
  teacherName: string;
  lessonTypeName: string;
}

export default function StudentHome() {
  const { firebaseUser, userDoc } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<TeacherInfo[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingLesson[]>([]);
  const [cancelling, setCancelling] = useState("");

  const loadData = useCallback(async () => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    // Get connected teachers
    const relSnap = await getDocs(
      query(
        collection(db, "teacherStudents"),
        where("studentId", "==", uid),
        where("status", "==", "active")
      )
    );

    const teacherIds = relSnap.docs.map((d) => d.data().teacherId as string);
    const teacherList: TeacherInfo[] = [];

    for (const tId of teacherIds) {
      const [userSnap, profileSnap] = await Promise.all([
        getDoc(doc(db, "users", tId)),
        getDoc(doc(db, "teacherProfiles", tId)),
      ]);
      teacherList.push({
        id: tId,
        displayName: userSnap.data()?.displayName ?? "Teacher",
        slug: profileSnap.data()?.slug ?? "",
      });
    }
    setTeachers(teacherList);

    // Get upcoming lessons
    const now = Timestamp.now();
    const lessonsSnap = await getDocs(
      query(
        collection(db, "lessons"),
        where("studentId", "==", uid),
        where("status", "==", "scheduled"),
        where("scheduledAt", ">=", now)
      )
    );

    const teacherNameCache = new Map<string, string>();
    for (const t of teacherList) teacherNameCache.set(t.id, t.displayName);

    const ltNameCache = new Map<string, string>();
    const items: UpcomingLesson[] = [];

    for (const d of lessonsSnap.docs) {
      const data = d.data() as Lesson;

      if (!teacherNameCache.has(data.teacherId)) {
        const snap = await getDoc(doc(db, "users", data.teacherId));
        teacherNameCache.set(data.teacherId, snap.data()?.displayName ?? "Teacher");
      }

      if (!ltNameCache.has(data.lessonTypeId)) {
        const snap = await getDoc(doc(db, "lessonTypes", data.lessonTypeId));
        ltNameCache.set(data.lessonTypeId, snap.data()?.name ?? "Lesson");
      }

      items.push({
        id: d.id,
        data,
        teacherName: teacherNameCache.get(data.teacherId)!,
        lessonTypeName: ltNameCache.get(data.lessonTypeId)!,
      });
    }

    items.sort((a, b) => a.data.scheduledAt.toMillis() - b.data.scheduledAt.toMillis());
    setUpcoming(items);
    setLoading(false);
  }, [firebaseUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCancel = async (lessonId: string) => {
    setCancelling(lessonId);
    try {
      const functions = getFunctions(app);
      const fn = httpsCallable(functions, "cancelLesson");
      const result = (await fn({ lessonId })) as { data: { creditReturned: boolean } };
      toast.success(
        result.data.creditReturned
          ? "Lesson cancelled. Credit returned."
          : "Lesson cancelled. Late cancellation — credit not returned."
      );
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setCancelling("");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <h1 className="text-2xl font-bold text-brand-800">
        Welcome{userDoc?.displayName ? `, ${userDoc.displayName}` : ""}
      </h1>

      {/* Teachers */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-brand-700">Your Teachers</h2>
        {teachers.length === 0 ? (
          <p className="text-sm text-brand-400">No teachers yet</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {teachers.map((t) => (
              <Card key={t.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <span className="font-medium text-brand-800">{t.displayName}</span>
                  {t.slug && (
                    <Button asChild size="sm" className="bg-accent-500 hover:bg-accent-600">
                      <Link to={`/book/${t.slug}`}>
                        <Calendar className="mr-1 h-4 w-4" />
                        Book
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming Lessons */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-brand-700">Upcoming Lessons</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-brand-400">No upcoming lessons</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((lesson) => {
              const at = lesson.data.scheduledAt.toDate();
              const dateStr = at.toISOString().split("T")[0];
              const time = `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
              const endMin =
                at.getHours() * 60 +
                at.getMinutes() +
                lesson.data.durationMinutes;
              const endTimeStr = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;

              return (
                <Card key={lesson.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-brand-800">
                          {lesson.lessonTypeName}
                        </p>
                        <p className="text-sm text-brand-500">
                          {formatLongDate(dateStr)}
                        </p>
                        <p className="text-sm text-brand-500">
                          {formatTime(time)} - {formatTime(endTimeStr)} &middot;{" "}
                          {formatDuration(lesson.data.durationMinutes)}
                        </p>
                        <p className="text-sm text-brand-400">
                          with {lesson.teacherName}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(lesson.id)}
                        disabled={cancelling === lesson.id}
                        className="text-brand-400 hover:text-red-600"
                      >
                        {cancelling === lesson.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1`
Expected: Successful build

- [ ] **Step 3: Commit**

```bash
git add src/pages/student/home.tsx
git commit -m "feat: update student home with teacher list and upcoming lessons"
```

---

### Task 11: Route Wiring + Firestore Indexes

**Files:**
- Modify: `src/App.tsx`
- Modify: `firestore.indexes.json`

**Context:** Read current `src/App.tsx` for the existing route structure. The sidebar already has `/availability` and `/lessons` nav items (see `src/components/layout/teacher-sidebar.tsx:18-19`). The `/lessons` link should point to the schedule page — rename the route path to match or update the sidebar. Check the sidebar: it has `{ to: "/lessons", label: "Lessons", icon: BookOpen }`.

- [ ] **Step 1: Add new routes to App.tsx**

Add imports at the top of `src/App.tsx`:

```typescript
import AvailabilityPage from "@/pages/teacher/availability";
import SchedulePage from "@/pages/teacher/schedule";
import BookPage from "@/pages/student/book";
```

Inside the teacher `<SetupGuard>` block (after the existing routes around line 47-49), add:

```typescript
<Route path="/availability" element={<AvailabilityPage />} />
<Route path="/lessons" element={<SchedulePage />} />
```

Inside the student routes block (after the `/home` route around line 55), add:

```typescript
<Route path="/book/:teacherSlug" element={<BookPage />} />
```

**Note:** The booking page renders its own layout (no AppShell sidebar needed). However, since it's inside the `<AppShell>` wrapper in the current route structure, move it outside. Add it as a standalone authenticated student route alongside the setup wizard pattern:

Actually, keep it simple — add it inside the authenticated block but outside the AppShell:

After the setup wizard route block (line 39) and before the AppShell block (line 42), add:

```typescript
<Route element={<RoleGuard role="student" />}>
  <Route path="/book/:teacherSlug" element={<BookPage />} />
</Route>
```

- [ ] **Step 2: Add Firestore composite index for student schedule queries**

Add this entry to the `indexes` array in `firestore.indexes.json`:

```json
{
  "collectionGroup": "lessons",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "studentId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "scheduledAt", "order": "ASCENDING" }
  ]
}
```

This supports the student home page query: `where studentId == X AND status == "scheduled" AND scheduledAt >= now`.

- [ ] **Step 3: Verify both builds**

Run: `npm run build 2>&1 && cd functions && npm run build 2>&1`
Expected: Both compile cleanly

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx firestore.indexes.json
git commit -m "feat: wire scheduling routes and add student schedule index"
```

---

### Task 12: Final Verification

- [ ] **Step 1: Full frontend build**

Run: `npm run build 2>&1`
Expected: Successful build, no TypeScript errors

- [ ] **Step 2: Full functions build**

Run: `cd functions && npm run build 2>&1`
Expected: Clean compilation

- [ ] **Step 3: Start dev server and verify routes**

Run: `npx vite --port 5179 &`

Navigate to:
- `/availability` — should render (blank without Firebase creds is expected)
- `/lessons` — should render
- `/home` — should render (student route)
- `/book/some-slug` — should render

- [ ] **Step 4: Verify git status is clean**

Run: `git status`
Expected: No uncommitted changes (only untracked plan doc if not committed)

- [ ] **Step 5: Commit plan doc**

```bash
git add docs/superpowers/plans/2026-05-08-phase4-lesson-scheduling.md
git commit -m "docs: add Phase 4 lesson scheduling implementation plan"
```
