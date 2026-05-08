import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import app from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const functions = getFunctions(app);

export default function StripeSetupPage() {
  const { firebaseUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      const createLink = httpsCallable<
        { baseUrl: string },
        { url: string }
      >(functions, "createStripeConnectLink");

      const result = await createLink({ baseUrl: window.location.origin });
      window.location.href = result.data.url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to start Stripe setup";
      toast.error(message);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Connect Payments</CardTitle>
          <CardDescription>
            Connect your Stripe account to receive payments from students.
            Stripe handles all payment processing, identity verification, and payouts.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Button onClick={handleConnect} disabled={loading} size="lg" className="w-full">
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 h-4 w-4" />
            )}
            {loading ? "Redirecting to Stripe..." : "Connect with Stripe"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            You'll be redirected to Stripe to complete setup. Your banking details
            are stored securely by Stripe — never on our servers.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
