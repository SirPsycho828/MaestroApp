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
