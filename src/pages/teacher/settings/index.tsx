import { useNavigate } from "react-router";
import { RotateCcw, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ux/page-intro";
import { useTour } from "@/contexts/tour-context";
import { FadeIn } from "@/components/ui/animated";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { startTour } = useTour();

  return (
    <FadeIn>
      <h1 className="font-serif text-2xl">Settings</h1>
      <PageIntro>
        Manage your studio preferences and account settings.
      </PageIntro>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Onboarding</CardTitle>
          <p className="text-sm text-muted-foreground">
            Re-run the setup wizard or replay the app tour to refresh your
            knowledge.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/setup")}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Restart Setup Wizard
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              navigate("/dashboard");
              setTimeout(() => startTour(), 400);
            }}
          >
            <Compass className="mr-2 h-4 w-4" />
            Replay App Tour
          </Button>
        </CardContent>
      </Card>
    </FadeIn>
  );
}
