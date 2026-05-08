import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import type { LessonType } from "@/types";

interface LessonTypeCardProps {
  lessonType: LessonType & { id: string };
  onEdit: () => void;
  onDelete?: () => void;
}

export function LessonTypeCard({ lessonType, onEdit, onDelete }: LessonTypeCardProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-white p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-brand-700">{lessonType.name}</span>
          <Badge variant="secondary">
            {lessonType.isGroup ? "Group" : "1-on-1"}
          </Badge>
        </div>
        <p className="text-sm text-brand-400">
          {lessonType.durationMinutes} min &middot;{" "}
          ${(lessonType.priceAmount / 100).toFixed(2)} &middot;{" "}
          {lessonType.creditCost} {lessonType.creditCost === 1 ? "credit" : "credits"}
        </p>
        {lessonType.description && (
          <p className="text-sm text-brand-400">{lessonType.description}</p>
        )}
      </div>
      <div className="flex gap-1">
        <button
          onClick={onEdit}
          className="rounded-lg p-2 text-brand-400 hover:bg-brand-100 hover:text-brand-600"
        >
          <Pencil className="h-4 w-4" />
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            className="rounded-lg p-2 text-brand-400 hover:bg-brand-100 hover:text-error"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
