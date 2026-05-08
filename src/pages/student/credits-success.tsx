import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle } from "lucide-react";
import { ScaleIn } from "@/components/ui/animated";

export default function CreditsSuccessPage() {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState<"processing" | "done">("processing");
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    let timeout: ReturnType<typeof setTimeout>;
    const unsubscribes: (() => void)[] = [];

    (async () => {
      const relSnap = await getDocs(
        query(
          collection(db, "teacherStudents"),
          where("studentId", "==", uid),
          where("status", "==", "active")
        )
      );

      for (const relDoc of relSnap.docs) {
        const teacherId = relDoc.data().teacherId;
        const unsub = onSnapshot(
          doc(db, "studentCredits", `${teacherId}_${uid}`),
          (snap) => {
            if (snap.exists() && snap.data().balance > 0) {
              setBalance(snap.data().balance);
              setStatus("done");
            }
          }
        );
        unsubscribes.push(unsub);
      }
    })();

    timeout = setTimeout(() => {
      setStatus("done");
    }, 10000);

    return () => {
      clearTimeout(timeout);
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [firebaseUser]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <ScaleIn className="w-full max-w-md">
        <Card className="text-center">
          <CardHeader>
            {status === "processing" ? (
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            ) : (
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            )}
            <CardTitle className="text-2xl">
              {status === "processing" ? "Processing Payment..." : "Payment Successful!"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === "processing" ? (
              <p className="text-muted-foreground">
                Your credits will appear shortly...
              </p>
            ) : (
              <>
                {balance !== null && (
                  <p className="text-lg text-muted-foreground">
                    Your balance: <span className="font-bold text-foreground">{balance} credits</span>
                  </p>
                )}
                <p className="text-muted-foreground">
                  Credits have been added to your account.
                </p>
              </>
            )}
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={() => navigate("/home")}>Back to Home</Button>
              <Button variant="outline" onClick={() => navigate("/credits")}>
                View All Credits
              </Button>
            </div>
          </CardContent>
        </Card>
      </ScaleIn>
    </div>
  );
}
