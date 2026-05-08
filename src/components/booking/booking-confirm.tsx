import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { formatTime, formatLongDate, formatDuration, formatTimezone, addMinutesToTime } from "@/lib/time-utils";
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
  const endTime = addMinutesToTime(startTime, lessonType.durationMinutes);
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
