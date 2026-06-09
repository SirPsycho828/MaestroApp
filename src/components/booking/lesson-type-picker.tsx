import { Card, CardContent } from "@/components/ui/card";
import { Music } from "lucide-react";
import { formatDuration, formatPrice } from "@/lib/time-utils";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ux/empty-state";
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
  if (lessonTypes.length === 0) {
    return (
      <EmptyState
        icon={<Music className="h-6 w-6" />}
        title="No lesson types available"
        description="Your teacher hasn't set up lesson types yet. Check back soon or contact them directly."
      />
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Choose a Lesson Type</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {lessonTypes.map((lt) => (
          <Card
            key={lt.id}
            className={cn(
              "cursor-pointer transition-all",
              selected === lt.id
                ? "border-primary ring-2 ring-primary/20"
                : "hover:border-border"
            )}
            onClick={() => onSelect(lt.id)}
          >
            <CardContent className="p-4">
              <p className="font-semibold text-foreground">{lt.data.name}</p>
              <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                <span>{formatDuration(lt.data.durationMinutes)}</span>
                <span>{formatPrice(lt.data.priceAmount)}</span>
                <span>
                  {lt.data.creditCost} credit{lt.data.creditCost !== 1 ? "s" : ""}
                </span>
              </div>
              {lt.data.description && (
                <p className="mt-2 text-sm text-muted-foreground">{lt.data.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
