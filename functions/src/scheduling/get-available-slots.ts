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

  // Index recurring slots by day of week: dayOfWeek -> Set of startMinutes
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
