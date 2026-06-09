import type { TooltipRenderProps } from "react-joyride";
import { Button } from "@/components/ui/button";

export function TourTooltip({
  backProps,
  primaryProps,
  skipProps,
  step,
  tooltipProps,
  index,
  size,
  isLastStep,
  continuous,
}: TooltipRenderProps) {
  return (
    <div
      {...tooltipProps}
      className="w-80 rounded-lg bg-card p-5 shadow-xl border border-border"
    >
      {step.title && (
        <h3 className="font-serif text-base font-semibold text-card-foreground">
          {step.title}
        </h3>
      )}
      <p className="mt-1.5 text-sm text-muted-foreground">{step.content}</p>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {index + 1} of {size}
        </span>
        <div className="flex gap-2">
          {index > 0 && (
            <Button variant="ghost" size="sm" {...backProps}>
              Back
            </Button>
          )}
          {continuous && !isLastStep && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              {...skipProps}
            >
              Skip
            </Button>
          )}
          <Button size="sm" {...primaryProps}>
            {isLastStep ? "Done" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
