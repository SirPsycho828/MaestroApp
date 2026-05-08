import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const STEPS = [
  { label: "Profile", step: 1 },
  { label: "Lessons", step: 2 },
  { label: "Availability", step: 3 },
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
                  ? "bg-accent-500 text-white"
                  : s.step === currentStep
                    ? "bg-accent-500 text-white"
                    : "bg-brand-200 text-brand-400"
              )}
            >
              {s.step < currentStep ? (
                <Check className="h-4 w-4" />
              ) : (
                s.step
              )}
            </div>
            <span
              className={cn(
                "mt-1 text-xs font-medium",
                s.step <= currentStep ? "text-accent-500" : "text-brand-400"
              )}
            >
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "mx-2 mb-5 h-0.5 w-12 sm:w-20",
                s.step < currentStep ? "bg-accent-500" : "bg-brand-200"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
