import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Loader2 } from "lucide-react";

export function SetupGuard() {
  const { firebaseUser, role } = useAuth();
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);

  useEffect(() => {
    if (!firebaseUser || role !== "teacher") {
      setSetupComplete(true); // Non-teachers skip this guard
      return;
    }

    getDoc(doc(db, "teacherProfiles", firebaseUser.uid)).then((snap) => {
      if (snap.exists()) {
        setSetupComplete(snap.data().setupComplete === true);
      } else {
        setSetupComplete(false);
      }
    });
  }, [firebaseUser, role]);

  if (setupComplete === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

  if (!setupComplete) {
    return <Navigate to="/setup" replace />;
  }

  return <Outlet />;
}
