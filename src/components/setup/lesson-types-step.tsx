import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LessonTypeForm } from "./lesson-type-form";
import { LessonTypeCard } from "@/components/settings/lesson-type-card";
import { Plus, BookOpen, Loader2 } from "lucide-react";
import type { LessonType } from "@/types";

interface LessonTypesStepProps {
  lessonTypes: (LessonType & { id: string })[];
  onAdd: (data: Omit<LessonType, "teacherId" | "allowedLocationIds" | "active" | "createdAt" | "updatedAt">) => Promise<void>;
  onEdit: (id: string, data: Partial<LessonType>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onNext: () => void;
  onBack: () => void;
  submitting: boolean;
}

export function LessonTypesStep({
  lessonTypes,
  onAdd,
  onEdit,
  onDelete,
  onNext,
  onBack,
  submitting,
}: LessonTypesStepProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleAdd = async (data: {
    name: string;
    description: string;
    durationMinutes: number;
    priceAmount: number;
    creditCost: number;
    isGroup: boolean;
  }) => {
    await onAdd(data);
    setShowForm(false);
  };

  const handleEdit = async (data: {
    name: string;
    description: string;
    durationMinutes: number;
    priceAmount: number;
    creditCost: number;
    isGroup: boolean;
  }) => {
    if (editingId) {
      await onEdit(editingId, data);
      setEditingId(null);
    }
  };

  const handleNext = () => {
    if (lessonTypes.length === 0) {
      setError("Add at least one lesson type to continue");
      return;
    }
    setError("");
    onNext();
  };

  return (
    <div className="space-y-6">
      {lessonTypes.length === 0 && !showForm ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 font-semibold text-foreground">No lesson types yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first lesson type so students can book with you.
          </p>
          <Button
            onClick={() => setShowForm(true)}
            className="mt-4"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Lesson Type
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {lessonTypes.map((lt) =>
            editingId === lt.id ? (
              <LessonTypeForm
                key={lt.id}
                initialData={lt}
                onSubmit={handleEdit}
                onCancel={() => setEditingId(null)}
                submitting={submitting}
                isEditing
              />
            ) : (
              <LessonTypeCard
                key={lt.id}
                lessonType={lt}
                onEdit={() => {
                  setEditingId(lt.id);
                  setShowForm(false);
                }}
                onDelete={() => onDelete(lt.id)}
              />
            )
          )}
        </div>
      )}

      {showForm && (
        <LessonTypeForm
          onSubmit={handleAdd}
          onCancel={() => setShowForm(false)}
          submitting={submitting}
        />
      )}

      {lessonTypes.length > 0 && !showForm && editingId === null && (
        <Button
          variant="ghost"
          onClick={() => setShowForm(true)}
          className="text-primary"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add another
        </Button>
      )}

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex justify-between pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={submitting}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Next"}
        </Button>
      </div>
    </div>
  );
}
