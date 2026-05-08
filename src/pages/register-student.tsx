import { useEffect, useState } from "react";
import { useSearchParams, Navigate, Link } from "react-router";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { StudentRegisterForm } from "@/components/auth/student-register-form";
import { FadeIn } from "@/components/ui/animated";
import { Loader2, Music } from "lucide-react";

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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="pointer-events-none fixed left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2">
        <div className="h-[400px] w-[400px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <FadeIn className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <Music className="h-8 w-8 text-primary" />
            <span className="font-serif text-2xl font-bold">TuneFolio</span>
          </Link>
        </div>
        <StudentRegisterForm
          inviteToken={inviteToken}
          prefillName={prefill?.name}
          prefillEmail={prefill?.email}
        />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            to={`/login?invite=${inviteToken}`}
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </FadeIn>
    </div>
  );
}
