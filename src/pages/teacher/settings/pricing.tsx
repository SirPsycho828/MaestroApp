import { useCallback, useEffect, useState } from "react";
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
import { FadeIn } from "@/components/ui/animated";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  CreditCard,
  ExternalLink,
  CheckCircle,
  Pencil,
} from "lucide-react";
import type { SubscriptionPlan, CreditPack } from "@/types";

const functions = getFunctions(app);

type PlanWithId = SubscriptionPlan & { id: string };
type PackWithId = CreditPack & { id: string };

export default function PricingPage() {
  const { firebaseUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stripeOnboarded, setStripeOnboarded] = useState(false);
  const [plans, setPlans] = useState<PlanWithId[]>([]);
  const [packs, setPacks] = useState<PackWithId[]>([]);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [packDialogOpen, setPackDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanWithId | null>(null);
  const [editingPack, setEditingPack] = useState<PackWithId | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [planName, setPlanName] = useState("");
  const [planCredits, setPlanCredits] = useState("");
  const [planPrice, setPlanPrice] = useState("");

  const [packName, setPackName] = useState("");
  const [packCredits, setPackCredits] = useState("");
  const [packPrice, setPackPrice] = useState("");

  const loadData = useCallback(async () => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    const profileSnap = await getDoc(doc(db, "teacherProfiles", uid));
    setStripeOnboarded(profileSnap.data()?.stripeOnboarded ?? false);

    const [planSnap, packSnap] = await Promise.all([
      getDocs(query(collection(db, "subscriptionPlans"), where("teacherId", "==", uid))),
      getDocs(query(collection(db, "creditPacks"), where("teacherId", "==", uid))),
    ]);

    setPlans(planSnap.docs.map((d) => ({ id: d.id, ...(d.data() as SubscriptionPlan) })));
    setPacks(packSnap.docs.map((d) => ({ id: d.id, ...(d.data() as CreditPack) })));
    setLoading(false);
  }, [firebaseUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openNewPlan = () => {
    setEditingPlan(null);
    setPlanName("");
    setPlanCredits("");
    setPlanPrice("");
    setPlanDialogOpen(true);
  };

  const openEditPlan = (plan: PlanWithId) => {
    setEditingPlan(plan);
    setPlanName(plan.name);
    setPlanCredits(String(plan.creditsPerMonth));
    setPlanPrice(String(plan.priceAmount / 100));
    setPlanDialogOpen(true);
  };

  const handlePlanSubmit = async () => {
    if (!planName || !planCredits || !planPrice) return;
    setSubmitting(true);
    try {
      const priceAmount = Math.round(parseFloat(planPrice) * 100);
      const creditsPerMonth = parseInt(planCredits, 10);

      if (editingPlan) {
        const updatePlan = httpsCallable(functions, "updateSubscriptionPlan");
        await updatePlan({
          planId: editingPlan.id,
          name: planName,
          creditsPerMonth,
          priceAmount,
        });
        toast.success("Plan updated");
      } else {
        const createPlan = httpsCallable(functions, "createSubscriptionPlan");
        await createPlan({ name: planName, creditsPerMonth, priceAmount });
        toast.success("Plan created");
      }

      setPlanDialogOpen(false);
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save plan");
    } finally {
      setSubmitting(false);
    }
  };

  const togglePlanActive = async (plan: PlanWithId) => {
    try {
      const updatePlan = httpsCallable(functions, "updateSubscriptionPlan");
      await updatePlan({ planId: plan.id, active: !plan.active });
      toast.success(plan.active ? "Plan deactivated" : "Plan activated");
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle plan");
    }
  };

  const openNewPack = () => {
    setEditingPack(null);
    setPackName("");
    setPackCredits("");
    setPackPrice("");
    setPackDialogOpen(true);
  };

  const openEditPack = (pack: PackWithId) => {
    setEditingPack(pack);
    setPackName(pack.name);
    setPackCredits(String(pack.credits));
    setPackPrice(String(pack.priceAmount / 100));
    setPackDialogOpen(true);
  };

  const handlePackSubmit = async () => {
    if (!packName || !packCredits || !packPrice) return;
    setSubmitting(true);
    try {
      const priceAmount = Math.round(parseFloat(packPrice) * 100);
      const credits = parseInt(packCredits, 10);

      if (editingPack) {
        const updatePack = httpsCallable(functions, "updateCreditPack");
        await updatePack({
          packId: editingPack.id,
          name: packName,
          credits,
          priceAmount,
        });
        toast.success("Pack updated");
      } else {
        const createPack = httpsCallable(functions, "createCreditPack");
        await createPack({ name: packName, credits, priceAmount });
        toast.success("Pack created");
      }

      setPackDialogOpen(false);
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save pack");
    } finally {
      setSubmitting(false);
    }
  };

  const togglePackActive = async (pack: PackWithId) => {
    try {
      const updatePack = httpsCallable(functions, "updateCreditPack");
      await updatePack({ packId: pack.id, active: !pack.active });
      toast.success(pack.active ? "Pack deactivated" : "Pack activated");
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle pack");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stripeOnboarded) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold font-serif">Pricing</h1>
        <Card className="text-center">
          <CardHeader>
            <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
            <CardTitle>Connect Stripe to Set Pricing</CardTitle>
            <CardDescription>
              You need a Stripe account to create subscription plans and credit packs.
              Students will pay through Stripe — you receive payouts directly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => (window.location.href = "/stripe/setup")}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Connect with Stripe
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <FadeIn>
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-serif">Pricing</h1>
        <Badge variant="outline" className="gap-1 text-green-700 border-green-300 bg-green-50">
          <CheckCircle className="h-3 w-3" />
          Stripe Connected
        </Badge>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Subscription Plans</h2>
            <p className="text-sm text-muted-foreground">
              Monthly recurring plans that grant credits each billing cycle
            </p>
          </div>
          <Button size="sm" onClick={openNewPlan}>
            <Plus className="mr-1 h-4 w-4" /> Add Plan
          </Button>
        </div>

        {plans.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No subscription plans yet. Create one to let students subscribe.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.id} className={!plan.active ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    <Switch
                      checked={plan.active}
                      onCheckedChange={() => togglePlanActive(plan)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-2xl font-bold">
                    ${(plan.priceAmount / 100).toFixed(2)}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {plan.creditsPerMonth} credits per month
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => openEditPlan(plan)}
                  >
                    <Pencil className="mr-1 h-3 w-3" /> Edit
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Credit Packs</h2>
            <p className="text-sm text-muted-foreground">
              One-time purchases that add credits to a student's balance
            </p>
          </div>
          <Button size="sm" onClick={openNewPack}>
            <Plus className="mr-1 h-4 w-4" /> Add Pack
          </Button>
        </div>

        {packs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No credit packs yet. Create one to let students buy credits.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {packs.map((pack) => (
              <Card key={pack.id} className={!pack.active ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{pack.name}</CardTitle>
                    <Switch
                      checked={pack.active}
                      onCheckedChange={() => togglePackActive(pack)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-2xl font-bold">
                    ${(pack.priceAmount / 100).toFixed(2)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {pack.credits} credits
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => openEditPack(pack)}
                  >
                    <Pencil className="mr-1 h-3 w-3" /> Edit
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "New Subscription Plan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="plan-name">Plan Name</Label>
              <Input
                id="plan-name"
                placeholder='e.g., "4 Lessons/Month"'
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-credits">Credits per Month</Label>
              <Input
                id="plan-credits"
                type="number"
                min="1"
                placeholder="4"
                value={planCredits}
                onChange={(e) => setPlanCredits(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-price">Monthly Price ($)</Label>
              <Input
                id="plan-price"
                type="number"
                min="0.50"
                step="0.01"
                placeholder="160.00"
                value={planPrice}
                onChange={(e) => setPlanPrice(e.target.value)}
              />
            </div>
            <Button onClick={handlePlanSubmit} disabled={submitting} className="w-full">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingPlan ? "Save Changes" : "Create Plan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={packDialogOpen} onOpenChange={setPackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPack ? "Edit Pack" : "New Credit Pack"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pack-name">Pack Name</Label>
              <Input
                id="pack-name"
                placeholder='e.g., "4-Lesson Pack"'
                value={packName}
                onChange={(e) => setPackName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pack-credits">Credits</Label>
              <Input
                id="pack-credits"
                type="number"
                min="1"
                placeholder="4"
                value={packCredits}
                onChange={(e) => setPackCredits(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pack-price">Price ($)</Label>
              <Input
                id="pack-price"
                type="number"
                min="0.50"
                step="0.01"
                placeholder="180.00"
                value={packPrice}
                onChange={(e) => setPackPrice(e.target.value)}
              />
            </div>
            <Button onClick={handlePackSubmit} disabled={submitting} className="w-full">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingPack ? "Save Changes" : "Create Pack"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </FadeIn>
  );
}
