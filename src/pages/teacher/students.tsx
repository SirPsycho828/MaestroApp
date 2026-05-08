import { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { InviteDialog } from "@/components/students/invite-dialog";
import { InviteList } from "@/components/students/invite-list";
import { StudentRoster } from "@/components/students/student-roster";
import { Loader2 } from "lucide-react";
import type { Invite, TeacherStudent } from "@/types";

interface InviteWithId {
  id: string;
  data: Invite;
}

interface StudentWithId {
  id: string;
  data: TeacherStudent;
}

export default function StudentsPage() {
  const { firebaseUser } = useAuth();
  const [invites, setInvites] = useState<InviteWithId[]>([]);
  const [students, setStudents] = useState<StudentWithId[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    const [inviteSnap, studentSnap] = await Promise.all([
      getDocs(
        query(
          collection(db, "invites"),
          where("teacherId", "==", uid),
          where("status", "==", "pending"),
          orderBy("createdAt", "desc")
        )
      ),
      getDocs(
        query(
          collection(db, "teacherStudents"),
          where("teacherId", "==", uid),
          orderBy("studentDisplayName", "asc")
        )
      ),
    ]);

    setInvites(
      inviteSnap.docs.map((d) => ({ id: d.id, data: d.data() as Invite }))
    );
    setStudents(
      studentSnap.docs.map((d) => ({ id: d.id, data: d.data() as TeacherStudent }))
    );
    setLoading(false);
  }, [firebaseUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-800">Students</h1>
        <InviteDialog onInviteCreated={loadData} />
      </div>

      <StudentRoster students={students} onStatusChanged={loadData} />

      <InviteList invites={invites} onRevoked={loadData} />
    </div>
  );
}
