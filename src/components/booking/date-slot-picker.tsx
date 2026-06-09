import { useMemo, useState } from "react";
import { CalendarX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ux/empty-state";
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
  }, [dayWindows, durationMinutes]);

  if (slots.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={<CalendarX className="h-6 w-6" />}
          title="No availability"
          description="No available time slots in the next 30 days. Your teacher may need to update their availability."
        />
        <div className="flex justify-center">
          <Button variant="ghost" onClick={onBack}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pick a Date & Time</h2>
        <span className="text-sm text-muted-foreground">{formatTimezone(timezone)}</span>
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
                isSelected && "bg-primary text-primary-foreground",
                hasSlots && !isSelected && "hover:bg-primary/10 text-foreground",
                !hasSlots && "text-muted-foreground/50 cursor-not-allowed"
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
        <p className="py-8 text-center text-muted-foreground">
          No times available on this day
        </p>
      )}

      <Button variant="ghost" onClick={onBack}>
        Back
      </Button>
    </div>
  );
}
