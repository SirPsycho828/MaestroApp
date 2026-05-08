import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import app from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const functions = getFunctions(app);

interface LessonActionsProps {
  lessonId: string;
  status: string;
  scheduledAt: Date;
  durationMinutes: number;
  onAction: () => void; // refresh parent
}

export function LessonActions({
  lessonId,
  status,
  scheduledAt,
  durationMinutes,
  onAction,
}: LessonActionsProps) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState("");

  const lessonEndTime = scheduledAt.getTime() + durationMinutes * 60000;
  const isPast = Date.now() >= lessonEndTime;

  if (status !== "scheduled") return null;

  const callFunction = async (fnName: string, data: Record<string, unknown>) => {
    setLoading(fnName);
    try {
      const fn = httpsCallable(functions, fnName);
      await fn(data);
      toast.success(
        fnName === "completeLesson"
          ? "Lesson completed"
          : fnName === "cancelLesson"
            ? "Lesson cancelled"
            : "Marked as no-show"
      );
      onAction();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading("");
    }
  };

  return (
    <div className="mt-3 space-y-3 border-t border-brand-100 pt-3">
      {isPast && (
        <div className="space-y-2">
          <Textarea
            placeholder="Add lesson notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {isPast && (
          <>
            <Button
              size="sm"
              onClick={() =>
                callFunction("completeLesson", { lessonId, ...(notes ? { notes } : {}) })
              }
              disabled={!!loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading === "completeLesson" ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-1 h-4 w-4" />
              )}
              Complete
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => callFunction("markNoShow", { lessonId })}
              disabled={!!loading}
              className="text-red-600 hover:bg-red-50"
            >
              {loading === "markNoShow" ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="mr-1 h-4 w-4" />
              )}
              No Show
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => callFunction("cancelLesson", { lessonId })}
          disabled={!!loading}
        >
          {loading === "cancelLesson" ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="mr-1 h-4 w-4" />
          )}
          Cancel
        </Button>
      </div>
    </div>
  );
}
