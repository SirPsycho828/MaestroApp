import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Plus, Settings } from "lucide-react";
import type { StudentCredits, TeacherStudent } from "@/types";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animated";

type CreditInfo = {
  creditDocId: string;
  teacherId: string;
  teacherName: string;
  balance: number;
  subscriptionStatus?: string;
  stripeSubscriptionId?: string;
};

export default function CreditsPage() {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const [credits, setCredits] = useState<CreditInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    (async () => {
      const relSnap = await getDocs(
        query(
          collection(db, "teacherStudents"),
          where("studentId", "==", uid),
          where("status", "==", "active")
        )
      );

      const results: CreditInfo[] = [];
      for (const relDoc of relSnap.docs) {
        const rel = relDoc.data() as TeacherStudent;
        const creditDocId = `${rel.teacherId}_${uid}`;

        const creditSnap = await getDoc(doc(db, "studentCredits", creditDocId));
        const creditData = creditSnap.exists()
          ? (creditSnap.data() as StudentCredits)
          : null;

        const userSnap = await getDoc(doc(db, "users", rel.teacherId));

        results.push({
          creditDocId,
          teacherId: rel.teacherId,
          teacherName: userSnap.data()?.displayName ?? "Teacher",
          balance: creditData?.balance ?? 0,
          subscriptionStatus: creditData?.subscriptionStatus,
          stripeSubscriptionId: creditData?.stripeSubscriptionId,
        });
      }

      setCredits(results);
      setLoading(false);
    })();
  }, [firebaseUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (credits.length === 0) {
    return (
      <FadeIn>
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold font-serif">Credits</h1>
          <Card className="text-center">
            <CardContent className="py-12">
              <CreditCard className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                No teachers yet. Accept an invitation to get started.
              </p>
            </CardContent>
          </Card>
        </div>
      </FadeIn>
    );
  }

  return (
    <FadeIn>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold font-serif">Credits</h1>

        <StaggerContainer className="space-y-4">
          {credits.map((c) => {
            const statusColor =
              c.subscriptionStatus === "active"
                ? "bg-green-50 text-green-700 border-green-300"
                : c.subscriptionStatus === "past_due"
                  ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                  : "";

            return (
              <StaggerItem key={c.creditDocId}>
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{c.teacherName}</CardTitle>
                      {c.subscriptionStatus && (
                        <Badge variant="outline" className={statusColor}>
                          {c.subscriptionStatus === "active" && "Subscribed"}
                          {c.subscriptionStatus === "past_due" && "Past Due"}
                          {c.subscriptionStatus === "cancelled" && "Cancelled"}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`text-3xl font-bold ${
                          c.balance === 0
                            ? "text-red-600"
                            : c.balance <= 2
                              ? "text-yellow-600"
                              : "text-foreground"
                        }`}
                      >
                        {c.balance}
                      </span>
                      <span className="text-muted-foreground">credits</span>
                    </div>

                    {c.subscriptionStatus === "past_due" && (
                      <p className="text-sm text-yellow-700">
                        Payment failed. Update your payment method to continue your subscription.
                      </p>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => navigate(`/credits/buy?teacher=${c.teacherId}`)}
                      >
                        <Plus className="mr-1 h-4 w-4" /> Buy Credits
                      </Button>
                      {c.stripeSubscriptionId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/credits/buy?teacher=${c.teacherId}&manage=1`)}
                        >
                          <Settings className="mr-1 h-4 w-4" /> Manage
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </FadeIn>
  );
}
