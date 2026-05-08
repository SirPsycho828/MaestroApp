import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "@/lib/firebase";
import app from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, XCircle } from "lucide-react";
import { formatTime, formatLongDate, formatDuration, addMinutesToTime } from "@/lib/time-utils";
import { toast } from "sonner";
import type { Lesson } from "@/types";

const functions = getFunctions(app);

interface TeacherInfo {
  id: string;
  displayName: string;
  slug: string;
}

interface UpcomingLesson {
  id: string;
  data: Lesson;
  teacherName: string;
  lessonTypeName: string;
}

export default function StudentHome() {
  const { firebaseUser, userDoc } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<TeacherInfo[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingLesson[]>([]);
  const [creditBalances, setCreditBalances] = useState<Record<string, number>>({});
  const [cancelling, setCancelling] = useState("");

  const loadData = useCallback(async () => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    // Get connected teachers
    const relSnap = await getDocs(
      query(
        collection(db, "teacherStudents"),
        where("studentId", "==", uid),
        where("status", "==", "active")
      )
    );

    const teacherIds = relSnap.docs.map((d) => d.data().teacherId as string);
    const teacherList: TeacherInfo[] = [];

    for (const tId of teacherIds) {
      const [userSnap, profileSnap] = await Promise.all([
        getDoc(doc(db, "users", tId)),
        getDoc(doc(db, "teacherProfiles", tId)),
      ]);
      teacherList.push({
        id: tId,
        displayName: userSnap.data()?.displayName ?? "Teacher",
        slug: profileSnap.data()?.slug ?? "",
      });
    }
    setTeachers(teacherList);

    // Load credit balances per teacher
    const balances: Record<string, number> = {};
    await Promise.all(
      teacherIds.map(async (tId) => {
        const creditSnap = await getDoc(doc(db, "studentCredits", `${tId}_${uid}`));
        balances[tId] = creditSnap.exists() ? (creditSnap.data().balance as number) ?? 0 : 0;
      })
    );
    setCreditBalances(balances);

    // Get upcoming lessons
    const now = Timestamp.now();
    const lessonsSnap = await getDocs(
      query(
        collection(db, "lessons"),
        where("studentId", "==", uid),
        where("status", "==", "scheduled"),
        where("scheduledAt", ">=", now)
      )
    );

    const teacherNameCache = new Map<string, string>();
    for (const t of teacherList) teacherNameCache.set(t.id, t.displayName);

    const ltNameCache = new Map<string, string>();
    const items: UpcomingLesson[] = [];

    for (const d of lessonsSnap.docs) {
      const data = d.data() as Lesson;

      if (!teacherNameCache.has(data.teacherId)) {
        const snap = await getDoc(doc(db, "users", data.teacherId));
        teacherNameCache.set(data.teacherId, snap.data()?.displayName ?? "Teacher");
      }

      if (!ltNameCache.has(data.lessonTypeId)) {
        const snap = await getDoc(doc(db, "lessonTypes", data.lessonTypeId));
        ltNameCache.set(data.lessonTypeId, snap.data()?.name ?? "Lesson");
      }

      items.push({
        id: d.id,
        data,
        teacherName: teacherNameCache.get(data.teacherId)!,
        lessonTypeName: ltNameCache.get(data.lessonTypeId)!,
      });
    }

    items.sort((a, b) => a.data.scheduledAt.toMillis() - b.data.scheduledAt.toMillis());
    setUpcoming(items);
    setLoading(false);
  }, [firebaseUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCancel = async (lessonId: string) => {
    setCancelling(lessonId);
    try {
      const fn = httpsCallable(functions, "cancelLesson");
      const result = (await fn({ lessonId })) as { data: { creditReturned: boolean } };
      toast.success(
        result.data.creditReturned
          ? "Lesson cancelled. Credit returned."
          : "Lesson cancelled. Late cancellation — credit not returned."
      );
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setCancelling("");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <h1 className="text-2xl font-bold text-brand-800">
        Welcome{userDoc?.displayName ? `, ${userDoc.displayName}` : ""}
      </h1>

      {/* Teachers */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-brand-700">Your Teachers</h2>
        {teachers.length === 0 ? (
          <p className="text-sm text-brand-400">No teachers yet</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {teachers.map((t) => (
              <Card key={t.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-brand-800">{t.displayName}</span>
                    {t.slug && (
                      <Button asChild size="sm" className="bg-accent-500 hover:bg-accent-600">
                        <Link to={`/book/${t.slug}`}>
                          <Calendar className="mr-1 h-4 w-4" />
                          Book
                        </Link>
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-sm font-semibold ${
                      (creditBalances[t.id] ?? 0) === 0
                        ? "text-red-600"
                        : (creditBalances[t.id] ?? 0) <= 2
                          ? "text-yellow-600"
                          : "text-green-600"
                    }`}>
                      {creditBalances[t.id] ?? 0} credits
                    </span>
                    {(creditBalances[t.id] ?? 0) <= 2 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs"
                        onClick={() => navigate(`/credits/buy?teacher=${t.id}`)}
                      >
                        Buy Credits
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming Lessons */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-brand-700">Upcoming Lessons</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-brand-400">No upcoming lessons</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((lesson) => {
              const at = lesson.data.scheduledAt.toDate();
              const dateStr = at.toISOString().split("T")[0];
              const time = `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
              const endTimeStr = addMinutesToTime(time, lesson.data.durationMinutes);

              return (
                <Card key={lesson.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-brand-800">
                          {lesson.lessonTypeName}
                        </p>
                        <p className="text-sm text-brand-500">
                          {formatLongDate(dateStr)}
                        </p>
                        <p className="text-sm text-brand-500">
                          {formatTime(time)} - {formatTime(endTimeStr)} &middot;{" "}
                          {formatDuration(lesson.data.durationMinutes)}
                        </p>
                        <p className="text-sm text-brand-400">
                          with {lesson.teacherName}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(lesson.id)}
                        disabled={cancelling === lesson.id}
                        className="text-brand-400 hover:text-red-600"
                      >
                        {cancelling === lesson.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
