import { Badge } from "@/components/ui/badge";
import { formatTime, formatDuration, addMinutesToTime } from "@/lib/time-utils";
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
  const endTime = addMinutesToTime(startTime, durationMinutes);
  const cfg = statusConfig[status];

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors",
        onClick && "hover:border-border/80 cursor-pointer"
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-foreground">{studentName}</p>
          <p className="text-sm text-muted-foreground">
            {formatTime(startTime)} - {formatTime(endTime)} &middot; {lessonTypeName} &middot;{" "}
            {formatDuration(durationMinutes)}
          </p>
        </div>
        <Badge className={cfg.className}>{cfg.label}</Badge>
      </div>
    </button>
  );
}
