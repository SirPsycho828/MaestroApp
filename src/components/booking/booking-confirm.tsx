import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Loader2 } from "lucide-react";
import { formatTime, formatLongDate, formatDuration, formatTimezone, addMinutesToTime } from "@/lib/time-utils";
import type { LessonType } from "@/types";

interface BookingConfirmProps {
  lessonType: LessonType;
  date: string;
  startTime: string;
  timezone: string;
  creditBalance: number;
  teacherId: string;
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
  teacherId,
  onConfirm,
  onBack,
  confirming,
}: BookingConfirmProps) {
  const endTime = addMinutesToTime(startTime, lessonType.durationMinutes);
  const sufficient = creditBalance >= lessonType.creditCost;
  const remaining = creditBalance - lessonType.creditCost;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Confirm Booking</h2>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Lesson</span>
            <span className="font-medium text-foreground">{lessonType.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span className="font-medium text-foreground">{formatLongDate(date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Time</span>
            <span className="font-medium text-foreground">
              {formatTime(startTime)} - {formatTime(endTime)} ({formatTimezone(timezone)})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Duration</span>
            <span className="font-medium text-foreground">
              {formatDuration(lessonType.durationMinutes)}
            </span>
          </div>

          <hr className="border-border" />

          <div className="flex justify-between">
            <span className="text-muted-foreground">Credit cost</span>
            <span className="font-medium text-foreground">
              {lessonType.creditCost} credit{lessonType.creditCost !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Your balance</span>
            <span className="font-medium text-foreground">
              {creditBalance} credit{creditBalance !== 1 ? "s" : ""}
            </span>
          </div>
          {sufficient && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">After booking</span>
              <span className="font-medium text-foreground">
                {remaining} credit{remaining !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {!sufficient && (
        <div className="space-y-3">
          <Badge variant="destructive" className="w-full justify-center py-2">
            You need {lessonType.creditCost - creditBalance} more credit
            {lessonType.creditCost - creditBalance !== 1 ? "s" : ""} to book this lesson
          </Badge>
          <Button asChild variant="outline" className="w-full">
            <Link to={`/credits/buy?teacher=${teacherId}`}>
              <CreditCard className="mr-2 h-4 w-4" />
              Buy Credits
            </Link>
          </Button>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={onConfirm}
          disabled={!sufficient || confirming}
        >
          {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Booking"}
        </Button>
      </div>
    </div>
  );
}
