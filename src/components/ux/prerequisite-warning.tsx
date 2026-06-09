import { Link } from "react-router";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrerequisiteWarningProps {
  message: string;
  action?: { label: string; to: string };
}

export function PrerequisiteWarning({
  message,
  action,
}: PrerequisiteWarningProps) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-warning/30 bg-warning-bg p-3 text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
      <p className="flex-1 text-foreground">{message}</p>
      {action && (
        <Button asChild variant="outline" size="sm">
          <Link to={action.to}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
