import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_INDICES = [1, 2, 3, 4, 5, 6, 0]; // Mon=1 ... Sun=0

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 6; h < 22; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return slots;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function slotKey(dayIndex: number, time: string): string {
  return `${dayIndex}-${time}`;
}

function endTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const totalMin = h * 60 + m + 30;
  return `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
}

interface AvailabilityGridProps {
  /** Set of "dayIndex-HH:mm" keys representing selected 30-min slots */
  value: Set<string>;
  onChange: (value: Set<string>) => void;
  onSubmit: () => Promise<void>;
  onBack: () => void;
  submitting: boolean;
  timezone: string;
  onTimezoneChange?: () => void;
}

export function AvailabilityGrid({
  value,
  onChange,
  onSubmit,
  onBack,
  submitting,
  timezone,
}: AvailabilityGridProps) {
  const timeSlots = useMemo(generateTimeSlots, []);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [dragAction, setDragAction] = useState<"add" | "remove">("add");

  const toggle = (key: string) => {
    const next = new Set(value);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onChange(next);
  };

  const handlePointerDown = (key: string) => {
    setIsDragging(true);
    setDragAction(value.has(key) ? "remove" : "add");
    toggle(key);
  };

  const handlePointerEnter = (key: string) => {
    if (!isDragging) return;
    const next = new Set(value);
    if (dragAction === "add") {
      next.add(key);
    } else {
      next.delete(key);
    }
    onChange(next);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const quickFill = (pattern: "weekday-am" | "weekday-pm" | "clear") => {
    if (pattern === "clear") {
      onChange(new Set());
      return;
    }
    const next = new Set(value);
    const weekdayIndices = [1, 2, 3, 4, 5]; // Mon-Fri
    const times =
      pattern === "weekday-am"
        ? timeSlots.filter((t) => t >= "09:00" && t < "12:00")
        : timeSlots.filter((t) => t >= "13:00" && t < "17:00");

    for (const day of weekdayIndices) {
      for (const time of times) {
        next.add(slotKey(day, time));
      }
    }
    onChange(next);
  };

  const handleFinish = async () => {
    if (value.size === 0) {
      setError("Select at least one time slot");
      return;
    }
    setError("");
    await onSubmit();
  };

  return (
    <div className="space-y-4" onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
      {/* Timezone */}
      <p className="text-sm text-brand-400">
        Times shown in {timezone.replace(/_/g, " ")}
      </p>

      {/* Quick-fill buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => quickFill("weekday-am")}
        >
          Weekday mornings (9-12)
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => quickFill("weekday-pm")}
        >
          Weekday afternoons (1-5)
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => quickFill("clear")}
          className="text-error"
        >
          Clear all
        </Button>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border border-brand-200">
        <div className="min-w-[500px]">
          {/* Header row */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-brand-200 bg-brand-50">
            <div className="p-2" />
            {DAYS.map((day) => (
              <div
                key={day}
                className="p-2 text-center text-xs font-semibold text-brand-600"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Time rows */}
          {timeSlots.map((time) => (
            <div
              key={time}
              className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-brand-100 last:border-b-0"
            >
              <div className="flex items-center px-2 text-xs text-brand-400">
                {time.endsWith(":00") ? formatTime(time) : ""}
              </div>
              {DAY_INDICES.map((dayIndex) => {
                const key = slotKey(dayIndex, time);
                const selected = value.has(key);
                return (
                  <div
                    key={key}
                    onPointerDown={() => handlePointerDown(key)}
                    onPointerEnter={() => handlePointerEnter(key)}
                    className={cn(
                      "h-7 cursor-pointer border-l border-brand-100 transition-colors select-none",
                      selected
                        ? "bg-accent-50 border-l-2 border-l-accent-500"
                        : "hover:bg-brand-50"
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="text-sm text-brand-400">
        {value.size} slot{value.size !== 1 ? "s" : ""} selected ({value.size * 30} minutes total)
      </p>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex justify-between pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={handleFinish}
          disabled={submitting}
          className="bg-accent-500 hover:bg-accent-600"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finish"}
        </Button>
      </div>
    </div>
  );
}

export { slotKey, endTime, DAY_INDICES };
