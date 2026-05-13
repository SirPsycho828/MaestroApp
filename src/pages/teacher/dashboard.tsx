import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Calendar,
  CreditCard,
  ArrowRight,
  Loader2,
  Clock,
  BookOpen,
} from "lucide-react";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animated";
import { formatTime, formatLongDate, addMinutesToTime } from "@/lib/time-utils";
import type { Lesson } from "@/types";

interface UpcomingLesson {
  id: string;
  data: Lesson;
  studentName: string;
  lessonTypeName: string;
}

export default function TeacherDashboard() {
  const { firebaseUser, userDoc } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentCount, setStudentCount] = useState(0);
  const [todayLessonCount, setTodayLessonCount] = useState(0);
  const [weekLessonCount, setWeekLessonCount] = useState(0);
  const [upcoming, setUpcoming] = useState<UpcomingLesson[]>([]);

  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    (async () => {
      const studentSnap = await getDocs(
        query(
          collection(db, "teacherStudents"),
          where("teacherId", "==", uid),
          where("status", "==", "active")
        )
      );
      setStudentCount(studentSnap.size);

      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      const todaySnap = await getDocs(
        query(
          collection(db, "lessons"),
          where("teacherId", "==", uid),
          where("status", "==", "scheduled"),
          where("scheduledAt", ">=", Timestamp.fromDate(startOfDay)),
          where("scheduledAt", "<=", Timestamp.fromDate(endOfDay))
        )
      );
      setTodayLessonCount(todaySnap.size);

      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const weekSnap = await getDocs(
        query(
          collection(db, "lessons"),
          where("teacherId", "==", uid),
          where("status", "==", "scheduled"),
          where("scheduledAt", ">=", Timestamp.fromDate(monday)),
          where("scheduledAt", "<=", Timestamp.fromDate(sunday))
        )
      );
      setWeekLessonCount(weekSnap.size);

      const upcomingSnap = await getDocs(
        query(
          collection(db, "lessons"),
          where("teacherId", "==", uid),
          where("status", "==", "scheduled"),
          where("scheduledAt", ">=", Timestamp.now())
        )
      );

      const studentCache = new Map<string, string>();
      const ltCache = new Map<string, string>();
      const items: UpcomingLesson[] = [];

      const sorted = upcomingSnap.docs
        .sort((a, b) => a.data().scheduledAt.toMillis() - b.data().scheduledAt.toMillis())
        .slice(0, 3);

      for (const d of sorted) {
        const data = d.data() as Lesson;

        if (!studentCache.has(data.studentId)) {
          const snap = await getDoc(doc(db, "users", data.studentId));
          studentCache.set(data.studentId, snap.data()?.displayName ?? "Student");
        }
        if (!ltCache.has(data.lessonTypeId)) {
          const snap = await getDoc(doc(db, "lessonTypes", data.lessonTypeId));
          ltCache.set(data.lessonTypeId, snap.data()?.name ?? "Lesson");
        }

        items.push({
          id: d.id,
          data,
          studentName: studentCache.get(data.studentId)!,
          lessonTypeName: ltCache.get(data.lessonTypeId)!,
        });
      }

      setUpcoming(items);
      setLoading(false);
    })();
  }, [firebaseUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const firstName = userDoc?.displayName?.split(" ")[0] ?? "";

  return (
    <div className="space-y-8">
      <FadeIn>
        <div>
          <h1 className="font-serif text-2xl font-semibold">
            {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening in your studio.
          </p>
        </div>
      </FadeIn>

      <StaggerContainer className="grid gap-4 sm:grid-cols-3">
        <StaggerItem>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/[0.06]">
                <Clock className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayLessonCount}</p>
                <p className="text-sm text-muted-foreground">Lessons today</p>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/[0.06]">
                <Calendar className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{weekLessonCount}</p>
                <p className="text-sm text-muted-foreground">This week</p>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/[0.06]">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{studentCount}</p>
                <p className="text-sm text-muted-foreground">Active students</p>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      <FadeIn delay={0.3}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold">Upcoming Lessons</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/lessons" className="gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>

          {upcoming.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-8 text-center">
                <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">No upcoming lessons</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {upcoming.map((lesson) => {
                const at = lesson.data.scheduledAt.toDate();
                const dateStr = at.toISOString().split("T")[0];
                const time = `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
                const endTime = addMinutesToTime(time, lesson.data.durationMinutes);

                return (
                  <Card key={lesson.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-sm font-semibold">
                          {formatTime(time)}
                        </div>
                        <div>
                          <p className="font-medium">{lesson.studentName}</p>
                          <p className="text-sm text-muted-foreground">
                            {lesson.lessonTypeName} &middot; {formatLongDate(dateStr)} &middot; {formatTime(time)}-{formatTime(endTime)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </FadeIn>

      <FadeIn delay={0.4}>
        <div className="space-y-4">
          <h2 className="font-serif text-lg font-semibold">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button asChild variant="outline" className="justify-start gap-2 h-auto py-3">
              <Link to="/students">
                <Users className="h-4 w-4 text-accent" />
                Manage Students
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2 h-auto py-3">
              <Link to="/availability">
                <Calendar className="h-4 w-4 text-accent" />
                Set Availability
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2 h-auto py-3">
              <Link to="/settings/pricing">
                <CreditCard className="h-4 w-4 text-accent" />
                Configure Pricing
              </Link>
            </Button>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
