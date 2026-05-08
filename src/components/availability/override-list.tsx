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
