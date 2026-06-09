import { useEffect, useState } from "react";
import { useSearchParams, Navigate, Link } from "react-router";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { StudentRegisterForm } from "@/components/auth/student-register-form";
import { AuthLayout } from "@/components/auth/auth-layout";
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <AuthLayout heading="Create your student account" subheading="Join your teacher on TuneFolio">
      <StudentRegisterForm
        inviteToken={inviteToken}
        prefillName={prefill?.name}
        prefillEmail={prefill?.email}
      />
      <p className="mt-6 text-center text-sm text-muted-foreground lg:text-left">
        Already have an account?{" "}
        <Link
          to={`/login?invite=${inviteToken}`}
          className="font-medium text-accent hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
