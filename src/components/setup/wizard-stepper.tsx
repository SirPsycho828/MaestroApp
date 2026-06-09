import { cn } from "@/lib/utils";
import { Check, Music } from "lucide-react";

const STEPS = [
  { label: "Welcome", step: 1 },
  { label: "Profile", step: 2 },
  { label: "Lessons", step: 3 },
  { label: "Availability", step: 4 },
  { label: "Done", step: 5 },
];

interface WizardStepperProps {
  currentStep: number;
}

export function WizardStepper({ currentStep }: WizardStepperProps) {
  return (
    <div className="flex items-center justify-center gap-0">
      {STEPS.map((s, i) => (
        <div key={s.step} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                s.step < currentStep
                  ? "bg-primary text-primary-foreground"
                  : s.step === currentStep
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {s.step < currentStep ? (
                <Check className="h-4 w-4" />
              ) : s.step === 1 ? (
                <Music className="h-4 w-4" />
              ) : s.step === 5 ? (
                <Check className="h-4 w-4" />
              ) : (
                s.step - 1
              )}
            </div>
            <span
              className={cn(
                "mt-1 text-xs font-medium",
                s.step <= currentStep ? "text-primary" : "text-muted-foreground"
              )}
            >
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "mx-2 mb-5 h-0.5 w-8 sm:w-12",
                s.step < currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
