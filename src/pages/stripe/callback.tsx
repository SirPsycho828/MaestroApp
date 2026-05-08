import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { getFunctions, httpsCallable } from "firebase/functions";
import app from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { FadeIn } from "@/components/ui/animated";

const functions = getFunctions(app);

export default function StripeCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const status = searchParams.get("status");

  const [checking, setChecking] = useState(true);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const checkStatus = httpsCallable<void, {
          onboarded: boolean;
          chargesEnabled: boolean;
          payoutsEnabled: boolean;
        }>(functions, "checkStripeStatus");
        const result = await checkStatus();
        setOnboarded(result.data.onboarded);
      } catch {
        // Status check failed — treat as incomplete
      } finally {
        setChecking(false);
      }
    };
    check();
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (onboarded) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <FadeIn>
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <CardTitle className="text-2xl">Stripe Connected!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Your Stripe account is set up and ready to accept payments.
              </p>
              <Button onClick={() => navigate("/settings/pricing")} className="w-full">
                Set Up Pricing
              </Button>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <FadeIn>
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <AlertCircle className="mx-auto h-12 w-12 text-yellow-500" />
            <CardTitle className="text-2xl">Setup Incomplete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {status === "refresh"
                ? "Your Stripe session expired. Please try again."
                : "Your account setup isn't finished yet. Complete it to start accepting payments."}
            </p>
            <Button onClick={() => navigate("/stripe/setup")} className="w-full">
              Continue Setup
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
