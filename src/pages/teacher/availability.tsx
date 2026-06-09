import { useCallback, useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { AvailabilityGrid, slotKey, endTime } from "@/components/setup/availability-grid";
import { OverrideForm } from "@/components/availability/override-form";
import { OverrideList } from "@/components/availability/override-list";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { FadeIn } from "@/components/ui/animated";
import { PageIntro } from "@/components/ux/page-intro";
import { GuidanceTip } from "@/components/ux/guidance-tip";
import { ConfirmDialog } from "@/components/ux/confirm-dialog";
import type { Availability } from "@/types";

interface OverrideWithId {
  id: string;
  data: Availability;
}

export default function AvailabilityPage() {
  const { firebaseUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [savedSlots, setSavedSlots] = useState<Set<string>>(new Set());
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [overrides, setOverrides] = useState<OverrideWithId[]>([]);
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const isDirty =
    selectedSlots.size !== savedSlots.size ||
    [...selectedSlots].some((s) => !savedSlots.has(s));

  // Load existing data
  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    const load = async () => {
      const snap = await getDocs(
        query(collection(db, "availability"), where("teacherId", "==", uid))
      );

      const slots = new Set<string>();
      const overrideList: OverrideWithId[] = [];

      snap.docs.forEach((d) => {
        const data = d.data() as Availability;
        if (data.recurring && !data.blocked && data.dayOfWeek != null) {
          slots.add(slotKey(data.dayOfWeek, data.startTime));
          if (data.timezone) setTimezone(data.timezone);
        } else if (!data.recurring && data.specificDate) {
          overrideList.push({ id: d.id, data });
        }
      });

      // Sort overrides by date
      overrideList.sort((a, b) => {
        const aTime = a.data.specificDate?.toMillis() ?? 0;
        const bTime = b.data.specificDate?.toMillis() ?? 0;
        return aTime - bTime;
      });

      setSelectedSlots(slots);
      setSavedSlots(new Set(slots));
      setOverrides(overrideList);
      setLoading(false);
    };

    load();
  }, [firebaseUser]);

  // Save weekly schedule
  const handleSave = useCallback(async () => {
    if (!firebaseUser) return;
    setSaving(true);
    try {
      const uid = firebaseUser.uid;

      // Delete existing recurring slots
      const existingSnap = await getDocs(
        query(
          collection(db, "availability"),
          where("teacherId", "==", uid),
          where("recurring", "==", true)
        )
      );
      await Promise.all(existingSnap.docs.map((d) => deleteDoc(d.ref)));

      // Write new slots
      await Promise.all(
        Array.from(selectedSlots).map((key) => {
          const [dayStr, time] = key.split("-");
          return addDoc(collection(db, "availability"), {
            teacherId: uid,
            dayOfWeek: Number(dayStr),
            startTime: time,
            endTime: endTime(time),
            timezone,
            recurring: true,
            blocked: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        })
      );

      setSavedSlots(new Set(selectedSlots));
      toast.success("Schedule saved. Students can now see your updated availability.");
    } catch {
      toast.error("Failed to save schedule");
    } finally {
      setSaving(false);
    }
  }, [firebaseUser, selectedSlots, timezone]);

  // Discard changes
  const handleDiscard = () => {
    setSelectedSlots(new Set(savedSlots));
    setShowDiscardConfirm(false);
  };

  // Add override
  const handleAddOverride = useCallback(
    async (data: { date: string; startTime: string; endTime: string; blocked: boolean }) => {
      if (!firebaseUser) return;

      const uid = firebaseUser.uid;
      const startMin = parseInt(data.startTime.split(":")[0]) * 60 + parseInt(data.startTime.split(":")[1]);
      const endMin = parseInt(data.endTime.split(":")[0]) * 60 + parseInt(data.endTime.split(":")[1]);
      const specificDate = Timestamp.fromDate(new Date(data.date + "T00:00:00Z"));

      const newDocs: OverrideWithId[] = [];

      for (let min = startMin; min < endMin; min += 30) {
        const h = Math.floor(min / 60);
        const m = min % 60;
        const st = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        const et30 = min + 30;
        const eh = Math.floor(et30 / 60);
        const em = et30 % 60;
        const et = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;

        const docRef = await addDoc(collection(db, "availability"), {
          teacherId: uid,
          dayOfWeek: null,
          startTime: st,
          endTime: et,
          timezone,
          recurring: false,
          specificDate,
          blocked: data.blocked,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        newDocs.push({
          id: docRef.id,
          data: {
            teacherId: uid,
            dayOfWeek: null,
            startTime: st,
            endTime: et,
            timezone,
            recurring: false,
            specificDate,
            blocked: data.blocked,
          } as Availability,
        });
      }

      setOverrides((prev) =>
        [...prev, ...newDocs].sort((a, b) => {
          const aTime = a.data.specificDate?.toMillis() ?? 0;
          const bTime = b.data.specificDate?.toMillis() ?? 0;
          return aTime - bTime;
        })
      );
      setShowOverrideForm(false);
      toast.success(data.blocked ? "Time blocked" : "Override added");
    },
    [firebaseUser, timezone]
  );

  // Delete override
  const handleDeleteOverride = useCallback(async (id: string) => {
    await deleteDoc(doc(db, "availability", id));
    setOverrides((prev) => prev.filter((o) => o.id !== id));
    toast.success("Override removed");
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <FadeIn>
      <div className="mx-auto max-w-4xl space-y-8 p-6">
        <h1 className="text-2xl font-semibold font-serif">Availability</h1>
        <PageIntro>
          Set your weekly teaching hours and add date-specific overrides. Students see these times when booking lessons.
        </PageIntro>

        {/* Weekly Schedule */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Weekly Schedule</h2>
            {isDirty && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-warning">Unsaved changes</span>
                <Button variant="ghost" size="sm" onClick={() => setShowDiscardConfirm(true)}>
                  Discard
                </Button>
              </div>
            )}
          </div>

          <GuidanceTip id="availability-grid-hint">
            Click or drag on the grid to select time slots when you're available to teach. Hit "Save Schedule" when you're done.
          </GuidanceTip>

          <AvailabilityGrid
            value={selectedSlots}
            onChange={setSelectedSlots}
            onSubmit={handleSave}
            onBack={handleDiscard}
            submitting={saving}
            timezone={timezone}
            submitLabel="Save Schedule"
          />
        </section>

        {/* Overrides */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Upcoming Overrides</h2>
            {!showOverrideForm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOverrideForm(true)}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Override
              </Button>
            )}
          </div>

          {showOverrideForm && (
            <OverrideForm
              onSave={handleAddOverride}
              onCancel={() => setShowOverrideForm(false)}
            />
          )}

          <OverrideList overrides={overrides} onDelete={handleDeleteOverride} />
        </section>
      </div>

      <ConfirmDialog
        open={showDiscardConfirm}
        onOpenChange={setShowDiscardConfirm}
        title="Discard changes?"
        description="Your unsaved changes to the weekly schedule will be lost."
        confirmLabel="Discard"
        variant="destructive"
        onConfirm={handleDiscard}
      />
    </FadeIn>
  );
}
