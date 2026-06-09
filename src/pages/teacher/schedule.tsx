import { useEffect, useState, useCallback } from "react";
import { FadeIn } from "@/components/ui/animated";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { LessonCard } from "@/components/schedule/lesson-card";
import { LessonActions } from "@/components/schedule/lesson-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatLongDate } from "@/lib/time-utils";
import { PageIntro } from "@/components/ux/page-intro";
import type { Lesson } from "@/types";

interface LessonWithMeta {
  id: string;
  data: Lesson;
  studentName: string;
  lessonTypeName: string;
  localTime: string; // "HH:mm"
  localDate: string; // "YYYY-MM-DD"
}

function getWeekBounds(offset: number): { start: Date; end: Date; label: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + offset * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const label = `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${sunday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  return { start: monday, end: sunday, label };
}

export default function SchedulePage() {
  const { firebaseUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [lessons, setLessons] = useState<LessonWithMeta[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { label } = getWeekBounds(weekOffset);

  const loadLessons = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);

    try {
      const { start, end } = getWeekBounds(weekOffset);
      const snap = await getDocs(
        query(
          collection(db, "lessons"),
          where("teacherId", "==", firebaseUser.uid),
          where("scheduledAt", ">=", Timestamp.fromDate(start)),
          where("scheduledAt", "<=", Timestamp.fromDate(end))
        )
      );

      // Fetch student names and lesson type names
      const studentCache = new Map<string, string>();
      const ltCache = new Map<string, string>();

      const items: LessonWithMeta[] = [];

      for (const d of snap.docs) {
        const data = d.data() as Lesson;

        // Student name
        if (!studentCache.has(data.studentId)) {
          const userSnap = await getDoc(doc(db, "users", data.studentId));
          studentCache.set(data.studentId, userSnap.data()?.displayName ?? "Student");
        }

        // Lesson type name
        if (!ltCache.has(data.lessonTypeId)) {
          const ltSnap = await getDoc(doc(db, "lessonTypes", data.lessonTypeId));
          ltCache.set(data.lessonTypeId, ltSnap.data()?.name ?? "Lesson");
        }

        // Convert scheduledAt to local time
        const at = data.scheduledAt.toDate();
        const localDate = at.toISOString().split("T")[0];
        const localTime = `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;

        items.push({
          id: d.id,
          data,
          studentName: studentCache.get(data.studentId)!,
          lessonTypeName: ltCache.get(data.lessonTypeId)!,
          localTime,
          localDate,
        });
      }

      // Sort by scheduledAt
      items.sort((a, b) => a.data.scheduledAt.toMillis() - b.data.scheduledAt.toMillis());
      setLessons(items);
    } catch (err) {
      console.error("Failed to load lessons:", err);
      setLessons([]);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, weekOffset]);

  useEffect(() => {
    loadLessons();
  }, [loadLessons]);

  // Group lessons by date
  const grouped = new Map<string, LessonWithMeta[]>();
  for (const lesson of lessons) {
    if (!grouped.has(lesson.localDate)) grouped.set(lesson.localDate, []);
    grouped.get(lesson.localDate)!.push(lesson);
  }

  return (
    <FadeIn>
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <h1 className="font-serif text-2xl font-semibold">Schedule</h1>
        {!loading && lessons.length > 0 && (
          <Badge variant="secondary">{lessons.length} lesson{lessons.length !== 1 ? "s" : ""}</Badge>
        )}
      </div>
      <PageIntro>View and manage your scheduled lessons. Mark lessons complete after they happen.</PageIntro>

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setWeekOffset((w) => w - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-foreground">{label}</span>
        <Button variant="ghost" size="sm" onClick={() => setWeekOffset((w) => w + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : lessons.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No lessons this week</p>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([date, dayLessons]) => (
            <div key={date}>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                {formatLongDate(date)}
              </h3>
              <div className="space-y-2">
                {dayLessons.map((lesson) => (
                  <div key={lesson.id}>
                    <LessonCard
                      startTime={lesson.localTime}
                      durationMinutes={lesson.data.durationMinutes}
                      studentName={lesson.studentName}
                      lessonTypeName={lesson.lessonTypeName}
                      status={lesson.data.status}
                      onClick={() =>
                        setExpandedId(expandedId === lesson.id ? null : lesson.id)
                      }
                    />
                    {expandedId === lesson.id && (
                      <LessonActions
                        lessonId={lesson.id}
                        status={lesson.data.status}
                        scheduledAt={lesson.data.scheduledAt.toDate()}
                        durationMinutes={lesson.data.durationMinutes}
                        onAction={loadLessons}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </FadeIn>
  );
}
