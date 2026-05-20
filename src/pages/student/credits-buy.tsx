import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import app, { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import type { SubscriptionPlan, CreditPack, StudentCredits } from "@/types";
import { FadeIn } from "@/components/ui/animated";

const functions = getFunctions(app);

type PlanWithId = SubscriptionPlan & { id: string };
type PackWithId = CreditPack & { id: string };

export default function CreditsBuyPage() {
  const { firebaseUser } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const teacherId = searchParams.get("teacher");

  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState("");
  const [plans, setPlans] = useState<PlanWithId[]>([]);
  const [packs, setPacks] = useState<PackWithId[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!firebaseUser || !teacherId) return;
    const uid = firebaseUser.uid;

    (async () => {
      const userSnap = await getDoc(doc(db, "users", teacherId));
      setTeacherName(userSnap.data()?.displayName ?? "Teacher");

      const creditSnap = await getDoc(doc(db, "studentCredits", `${teacherId}_${uid}`));
      if (creditSnap.exists()) {
        const data = creditSnap.data() as StudentCredits;
        setBalance(data.balance);
        setCurrentSubscription(data.subscriptionStatus === "active");
      }

      const [planSnap, packSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, "subscriptionPlans"),
            where("teacherId", "==", teacherId),
            where("active", "==", true)
          )
        ),
        getDocs(
          query(
            collection(db, "creditPacks"),
            where("teacherId", "==", teacherId),
            where("active", "==", true)
          )
        ),
      ]);

      setPlans(planSnap.docs.map((d) => ({ id: d.id, ...(d.data() as SubscriptionPlan) })));
      setPacks(packSnap.docs.map((d) => ({ id: d.id, ...(d.data() as CreditPack) })));
      setLoading(false);
    })();
  }, [firebaseUser, teacherId]);

  const handlePurchase = async (
    type: "subscription" | "credit_pack",
    itemId: string
  ) => {
    setPurchasing(itemId);
    try {
      const createSession = httpsCallable<
        Record<string, string>,
        { url: string }
      >(functions, "createCheckoutSession");

      const result = await createSession({
        teacherId: teacherId!,
        type,
        ...(type === "subscription" ? { planId: itemId } : { packId: itemId }),
        baseUrl: window.location.origin,
      });

      if (result.data.url) {
        window.location.href = result.data.url;
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start checkout");
      setPurchasing(null);
    }
  };

  const handleManageSubscription = async () => {
    setPurchasing("manage");
    try {
      const createPortal = httpsCallable<
        { teacherId: string; baseUrl: string },
        { url: string }
      >(functions, "createBillingPortalSession");

      const result = await createPortal({
        teacherId: teacherId!,
        baseUrl: window.location.origin,
      });

      if (result.data.url) {
        window.location.href = result.data.url;
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to open billing portal");
      setPurchasing(null);
    }
  };

  if (!teacherId) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Missing teacher parameter.
        <Button variant="link" onClick={() => navigate("/credits")}>
          Go back
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <FadeIn>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/credits")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold font-serif">Buy Credits</h1>
            <p className="text-sm text-muted-foreground">
              {teacherName} &middot; Current balance: {balance} credits
            </p>
          </div>
        </div>

        {currentSubscription && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  You have an active subscription
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleManageSubscription}
                disabled={purchasing === "manage"}
              >
                {purchasing === "manage" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Manage Subscription
              </Button>
            </CardContent>
          </Card>
        )}

        {plans.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Monthly Subscriptions</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {plans.map((plan) => (
                <Card key={plan.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-2xl font-bold">
                        ${(plan.priceAmount / 100).toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground">/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {plan.creditsPerMonth} credits per month
                    </p>
                    <Button
                      className="w-full"
                      onClick={() => handlePurchase("subscription", plan.id)}
                      disabled={!!purchasing || currentSubscription}
                    >
                      {purchasing === plan.id && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {currentSubscription ? "Already Subscribed" : "Subscribe"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {plans.length > 0 && packs.length > 0 && <Separator />}

        {packs.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Credit Packs</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {packs.map((pack) => (
                <Card key={pack.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{pack.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-2xl font-bold">
                      ${(pack.priceAmount / 100).toFixed(2)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {pack.credits} credits
                    </p>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => handlePurchase("credit_pack", pack.id)}
                      disabled={!!purchasing}
                    >
                      {purchasing === pack.id && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Buy
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {plans.length === 0 && packs.length === 0 && (
          <Card className="text-center">
            <CardContent className="py-12 text-muted-foreground">
              This teacher hasn&apos;t set up pricing yet. Check back later.
            </CardContent>
          </Card>
        )}
      </div>
    </FadeIn>
  );
}
