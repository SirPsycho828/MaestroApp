import { useEffect, useState } from "react";
import { useSearchParams, Navigate, Link } from "react-router";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { StudentRegisterForm } from "@/components/auth/student-register-form";
import { Loader2 } from "lucide-react";

export default function RegisterStudentPage() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const [prefill, setPrefill] = useState<{ name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!inviteToken) {
      setLoading(false);
      return;
    }

    async function loadPrefill() {
      const inviteQuery = query(
        collection(db, "invites"),
        where("token", "==", inviteToken),
        limit(1)
      );
      const snap = await getDocs(inviteQuery);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setPrefill({ name: data.studentName, email: data.studentEmail });
      }
      setLoading(false);
    }

    loadPrefill().catch(() => setLoading(false));
  }, [inviteToken]);

  if (!inviteToken) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-50">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-50 px-4">
      <StudentRegisterForm
        inviteToken={inviteToken}
        prefillName={prefill?.name}
        prefillEmail={prefill?.email}
      />
      <p className="mt-4 text-sm text-brand-400">
        Already have an account?{" "}
        <Link
          to={`/login?invite=${inviteToken}`}
          className="text-accent-500 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
