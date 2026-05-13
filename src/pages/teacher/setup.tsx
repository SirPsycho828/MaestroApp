import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "@/lib/firebase";
import app from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { WizardStepper } from "@/components/setup/wizard-stepper";
import { ProfileForm } from "@/components/setup/profile-form";
import { LessonTypesStep } from "@/components/setup/lesson-types-step";
import { AvailabilityGrid, slotKey, endTime } from "@/components/setup/availability-grid";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { TeacherProfile, LessonType } from "@/types";
import { FadeIn } from "@/components/ui/animated";

export default function SetupPage() {
  const { firebaseUser, userDoc } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Screen 1 data
  const [profile, setProfile] = useState<Partial<TeacherProfile>>({});

  // Screen 2 data
  const [lessonTypes, setLessonTypes] = useState<(LessonType & { id: string })[]>([]);

  // Screen 3 data
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  // Load existing data for resume
  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    const load = async () => {
      // Load profile
      const profileSnap = await getDoc(doc(db, "teacherProfiles", uid));
      if (profileSnap.exists()) {
        const data = profileSnap.data() as TeacherProfile;
        setProfile(data);

        // Determine starting step
        if (data.slug) {
          // Screen 1 complete, check screen 2
          const ltSnap = await getDocs(
            query(collection(db, "lessonTypes"), where("teacherId", "==", uid))
          );
          const types = ltSnap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as LessonType),
          }));
          setLessonTypes(types);

          if (types.length > 0) {
            // Screen 2 complete, load screen 3 data
            const availSnap = await getDocs(
              query(collection(db, "availability"), where("teacherId", "==", uid))
            );
            const slots = new Set<string>();
            availSnap.docs.forEach((d) => {
              const a = d.data();
              if (a.dayOfWeek != null && a.startTime) {
                slots.add(slotKey(a.dayOfWeek, a.startTime));
              }
            });
            setSelectedSlots(slots);

            if (availSnap.size > 0) {
              setCurrentStep(3);
              if (availSnap.docs[0].data().timezone) {
                setTimezone(availSnap.docs[0].data().timezone);
              }
            } else {
              setCurrentStep(3);
            }
          } else {
            setCurrentStep(2);
          }
        }
      }
      setLoading(false);
    };

    load();
  }, [firebaseUser]);

  // Screen 1: Save profile
  const handleProfileSubmit = useCallback(
    async (data: {
      displayName: string;
      slug: string;
      studioName: string;
      instruments: string[];
      bio: string;
    }) => {
      if (!firebaseUser) return;
      setSubmitting(true);
      try {
        await setDoc(
          doc(db, "teacherProfiles", firebaseUser.uid),
          {
            slug: data.slug,
            studioName: data.studioName || null,
            instruments: data.instruments,
            bio: data.bio || null,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        // Also update displayName on the user doc
        await updateDoc(doc(db, "users", firebaseUser.uid), {
          displayName: data.displayName,
          updatedAt: serverTimestamp(),
        });
        setProfile((prev) => ({ ...prev, ...data }));
        setCurrentStep(2);
      } catch {
        toast.error("Failed to save profile");
      } finally {
        setSubmitting(false);
      }
    },
    [firebaseUser]
  );

  // Screen 2: Add lesson type
  const handleAddLessonType = useCallback(
    async (data: {
      name: string;
      description?: string;
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
      } catch {
        toast.error("Failed to add lesson type");
      } finally {
        setSubmitting(false);
      }
    },
    [firebaseUser]
  );

  // Screen 2: Edit lesson type
  const handleEditLessonType = useCallback(
    async (id: string, data: Partial<LessonType>) => {
      setSubmitting(true);
      try {
        await updateDoc(doc(db, "lessonTypes", id), {
          ...data,
          updatedAt: serverTimestamp(),
        });
        setLessonTypes((prev) =>
          prev.map((lt) => (lt.id === id ? { ...lt, ...data } : lt))
        );
      } catch {
        toast.error("Failed to update lesson type");
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  // Screen 2: Delete lesson type
  const handleDeleteLessonType = useCallback(async (id: string) => {
    setSubmitting(true);
    try {
      await deleteDoc(doc(db, "lessonTypes", id));
      setLessonTypes((prev) => prev.filter((lt) => lt.id !== id));
    } catch {
      toast.error("Failed to delete lesson type");
    } finally {
      setSubmitting(false);
    }
  }, []);

  // Screen 3: Finish wizard
  const handleFinish = useCallback(async () => {
    if (!firebaseUser) return;
    setSubmitting(true);
    try {
      const uid = firebaseUser.uid;

      // Delete existing availability for this teacher
      const existingSnap = await getDocs(
        query(collection(db, "availability"), where("teacherId", "==", uid))
      );
      const deletePromises = existingSnap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      // Write new slots
      const addPromises = Array.from(selectedSlots).map((key) => {
        const [dayStr, time] = key.split("-");
        const dayOfWeek = Number(dayStr);
        return addDoc(collection(db, "availability"), {
          teacherId: uid,
          dayOfWeek,
          startTime: time,
          endTime: endTime(time),
          timezone,
          recurring: true,
          blocked: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await Promise.all(addPromises);

      // Call completeSetupWizard
      const functions = getFunctions(app);
      const completeFn = httpsCallable(functions, "completeSetupWizard");
      await completeFn({});

      toast.success("You're all set! Invite your first student to get started.");
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to complete setup";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [firebaseUser, selectedSlots, timezone, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-center font-serif">Set up your studio</h1>
        <p className="mt-2 text-center text-muted-foreground">
          Complete these steps to start receiving bookings
        </p>

        <div className="mt-8">
          <WizardStepper currentStep={currentStep} />
        </div>

        <FadeIn>
          <div className="mt-8">
            {currentStep === 1 && (
              <ProfileForm
                initialData={{
                  displayName: userDoc?.displayName || "",
                  slug: profile.slug,
                  studioName: profile.studioName,
                  instruments: profile.instruments,
                  bio: profile.bio,
                }}
                onSubmit={handleProfileSubmit}
                submitting={submitting}
              />
            )}

            {currentStep === 2 && (
              <LessonTypesStep
                lessonTypes={lessonTypes}
                onAdd={handleAddLessonType}
                onEdit={handleEditLessonType}
                onDelete={handleDeleteLessonType}
                onNext={() => setCurrentStep(3)}
                onBack={() => setCurrentStep(1)}
                submitting={submitting}
              />
            )}

            {currentStep === 3 && (
              <AvailabilityGrid
                value={selectedSlots}
                onChange={setSelectedSlots}
                onSubmit={handleFinish}
                onBack={() => setCurrentStep(2)}
                submitting={submitting}
                timezone={timezone}
              />
            )}
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
