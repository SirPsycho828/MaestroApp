import { useCallback, useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { LessonTypeForm } from "@/components/setup/lesson-type-form";
import { LessonTypeCard } from "@/components/settings/lesson-type-card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, BookOpen, Loader2 } from "lucide-react";
import type { LessonType } from "@/types";

export default function LessonTypesPage() {
  const { firebaseUser } = useAuth();
  const [lessonTypes, setLessonTypes] = useState<(LessonType & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    getDocs(
      query(collection(db, "lessonTypes"), where("teacherId", "==", firebaseUser.uid))
    ).then((snap) => {
      setLessonTypes(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as LessonType) }))
      );
      setLoading(false);
    });
  }, [firebaseUser]);

  const handleAdd = useCallback(
    async (data: {
      name: string;
      description: string;
      durationMinutes: number;
      priceAmount: number;
      creditCost: number;
      isGroup: boolean;
    }) => {
      if (!firebaseUser) return;
      setSubmitting(true);
      try {
        const docRef = await addDoc(collection(db, "lessonTypes"), {
          teacherId: firebaseUser.uid,
          name: data.name,
          description: data.description || null,
          durationMinutes: data.durationMinutes,
          priceAmount: data.priceAmount,
          creditCost: data.creditCost,
          isGroup: data.isGroup,
          allowedLocationIds: [],
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setLessonTypes((prev) => [
          ...prev,
          {
            id: docRef.id,
            teacherId: firebaseUser.uid,
            name: data.name,
            description: data.description || undefined,
            durationMinutes: data.durationMinutes,
            priceAmount: data.priceAmount,
            creditCost: data.creditCost,
            isGroup: data.isGroup,
            allowedLocationIds: [],
            active: true,
          } as unknown as LessonType & { id: string },
        ]);
        setShowForm(false);
        toast.success("Lesson type added");
      } catch {
        toast.error("Failed to add lesson type");
      } finally {
        setSubmitting(false);
      }
    },
    [firebaseUser]
  );

  const handleEdit = useCallback(
    async (data: {
      name: string;
      description: string;
      durationMinutes: number;
      priceAmount: number;
      creditCost: number;
      isGroup: boolean;
    }) => {
      if (!editingId) return;
      setSubmitting(true);
      try {
        await updateDoc(doc(db, "lessonTypes", editingId), {
          name: data.name,
          description: data.description || null,
          durationMinutes: data.durationMinutes,
          priceAmount: data.priceAmount,
          creditCost: data.creditCost,
          updatedAt: serverTimestamp(),
        });
        setLessonTypes((prev) =>
          prev.map((lt) =>
            lt.id === editingId ? { ...lt, ...data } : lt
          )
        );
        setEditingId(null);
        toast.success("Lesson type updated");
      } catch {
        toast.error("Failed to update lesson type");
      } finally {
        setSubmitting(false);
      }
    },
    [editingId]
  );

  const handleToggleActive = useCallback(
    async (id: string, active: boolean) => {
      try {
        await updateDoc(doc(db, "lessonTypes", id), {
          active,
          updatedAt: serverTimestamp(),
        });
        setLessonTypes((prev) =>
          prev.map((lt) => (lt.id === id ? { ...lt, active } : lt))
        );
        toast.success(active ? "Lesson type activated" : "Lesson type deactivated");
      } catch {
        toast.error("Failed to update lesson type");
      }
    },
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

  const activeTypes = lessonTypes.filter((lt) => lt.active);
  const inactiveTypes = lessonTypes.filter((lt) => !lt.active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1>Lesson Types</h1>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
          }}
          className="bg-accent-500 hover:bg-accent-600"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Lesson Type
        </Button>
      </div>

      {showForm && (
        <LessonTypeForm
          onSubmit={handleAdd}
          onCancel={() => setShowForm(false)}
          submitting={submitting}
        />
      )}

      {lessonTypes.length === 0 && !showForm ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-brand-200 bg-white px-6 py-12 text-center">
          <BookOpen className="h-8 w-8 text-brand-300" />
          <p className="mt-3 font-semibold text-brand-700">No lesson types yet</p>
          <p className="mt-1 text-sm text-brand-400">
            Add lesson types that students can book.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeTypes.map((lt) =>
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
              <div key={lt.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <LessonTypeCard
                    lessonType={lt}
                    onEdit={() => {
                      setEditingId(lt.id);
                      setShowForm(false);
                    }}
                  />
                </div>
                <Switch
                  checked={lt.active}
                  onCheckedChange={(active) => handleToggleActive(lt.id, active)}
                />
              </div>
            )
          )}

          {inactiveTypes.length > 0 && (
            <>
              <h3 className="pt-4 text-brand-400">Inactive</h3>
              {inactiveTypes.map((lt) =>
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
                  <div key={lt.id} className="flex items-center gap-2 opacity-60">
                    <div className="flex-1">
                      <LessonTypeCard
                        lessonType={lt}
                        onEdit={() => {
                          setEditingId(lt.id);
                          setShowForm(false);
                        }}
                      />
                    </div>
                    <Switch
                      checked={lt.active}
                      onCheckedChange={(active) => handleToggleActive(lt.id, active)}
                    />
                  </div>
                )
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
