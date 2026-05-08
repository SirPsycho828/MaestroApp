import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "@/lib/firebase";
import app from "@/lib/firebase";

const functions = getFunctions(app);
import { useAuth } from "@/contexts/auth-context";
import { LessonTypePicker } from "@/components/booking/lesson-type-picker";
import { DateSlotPicker } from "@/components/booking/date-slot-picker";
import { BookingConfirm } from "@/components/booking/booking-confirm";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { LessonType } from "@/types";
import { FadeIn } from "@/components/ui/animated";

interface LessonTypeWithId {
  id: string;
  data: LessonType;
}

interface DaySlots {
  date: string;
  windows: Array<{ start: string; end: string }>;
}

export default function BookPage() {
  const { teacherSlug } = useParams<{ teacherSlug: string }>();
  const navigate = useNavigate();
  const { firebaseUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [lessonTypes, setLessonTypes] = useState<LessonTypeWithId[]>([]);
  const [slots, setSlots] = useState<DaySlots[]>([]);
  const [timezone, setTimezone] = useState("");
  const [creditBalance, setCreditBalance] = useState(0);

  // Step state
  const [step, setStep] = useState(1);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [confirming, setConfirming] = useState(false);

  const selectedType = lessonTypes.find((lt) => lt.id === selectedTypeId);

  // Load teacher + lesson types + slots + credit balance
  useEffect(() => {
    if (!firebaseUser || !teacherSlug) return;

    const load = async () => {
      try {
        // Resolve slug to teacherId
        const profilesSnap = await getDocs(
          query(collection(db, "teacherProfiles"), where("slug", "==", teacherSlug))
        );

        if (profilesSnap.empty) {
          setError("Teacher not found");
          setLoading(false);
          return;
        }

        const tId = profilesSnap.docs[0].id;
        setTeacherId(tId);

        // Get teacher name
        const userSnap = await getDoc(doc(db, "users", tId));
        setTeacherName(userSnap.data()?.displayName ?? "Your Teacher");

        // Load lesson types, slots, and credits in parallel
        const getSlotsFn = httpsCallable(functions, "getAvailableSlots");

        const today = new Date().toISOString().split("T")[0];
        const endDate = new Date(Date.now() + 29 * 86400000).toISOString().split("T")[0];

        const [ltSnap, slotsRes, creditSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, "lessonTypes"),
              where("teacherId", "==", tId),
              where("active", "==", true)
            )
          ),
          getSlotsFn({ teacherId: tId, startDate: today, endDate }),
          getDoc(doc(db, "studentCredits", `${tId}_${firebaseUser.uid}`)),
        ]);

        setLessonTypes(
          ltSnap.docs
            .map((d) => ({ id: d.id, data: d.data() as LessonType }))
            .filter((lt) => !lt.data.isGroup)
        );

        const slotsData = slotsRes.data as {
          slots: DaySlots[];
          timezone: string;
        };
        setSlots(slotsData.slots);
        setTimezone(slotsData.timezone);

        setCreditBalance(creditSnap.exists() ? (creditSnap.data()?.balance ?? 0) : 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load booking data");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [firebaseUser, teacherSlug]);

  // Step 1: Select lesson type
  const handleSelectType = (id: string) => {
    setSelectedTypeId(id);
    setStep(2);
  };

  // Step 2: Select date/time
  const handleSelectSlot = (date: string, startTime: string) => {
    setSelectedDate(date);
    setSelectedTime(startTime);
    setStep(3);
  };

  // Step 3: Confirm booking
  const handleConfirm = useCallback(async () => {
    if (!selectedType || !selectedDate || !selectedTime) return;
    setConfirming(true);
    try {
      const bookFn = httpsCallable(functions, "bookLesson");
      await bookFn({
        teacherId,
        lessonTypeId: selectedTypeId,
        locationId: null,
        date: selectedDate,
        startTime: selectedTime,
      });
      toast.success("Lesson booked!");
      navigate("/home");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Booking failed";
      toast.error(message);
    } finally {
      setConfirming(false);
    }
  }, [teacherId, selectedTypeId, selectedType, selectedDate, selectedTime, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{error}</p>
        <Button variant="ghost" onClick={() => navigate("/home")}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-8">
        <button
          onClick={() => (step > 1 ? setStep(step - 1) : navigate("/home"))}
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {step > 1 ? "Back" : "Home"}
        </button>

        <h1 className="text-2xl font-bold font-serif text-foreground">Book with {teacherName}</h1>

        <div className="mt-2 mb-6 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full",
                s <= step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        <FadeIn>
          <div className="mt-6">
            {step === 1 && (
              <LessonTypePicker
                lessonTypes={lessonTypes}
                selected={selectedTypeId}
                onSelect={handleSelectType}
              />
            )}

            {step === 2 && selectedType && (
              <DateSlotPicker
                slots={slots}
                timezone={timezone}
                durationMinutes={selectedType.data.durationMinutes}
                onSelect={handleSelectSlot}
                onBack={() => setStep(1)}
              />
            )}

            {step === 3 && selectedType && (
              <BookingConfirm
                lessonType={selectedType.data}
                date={selectedDate}
                startTime={selectedTime}
                timezone={timezone}
                creditBalance={creditBalance}
                onConfirm={handleConfirm}
                onBack={() => setStep(2)}
                confirming={confirming}
              />
            )}
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
