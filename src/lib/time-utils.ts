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
