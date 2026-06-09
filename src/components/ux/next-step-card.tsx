import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NextStepCardProps {
  title: string;
  description: string;
  to: string;
  actionLabel?: string;
  icon?: React.ReactNode;
}

export function NextStepCard({
  title,
  description,
  to,
  actionLabel,
  icon,
}: NextStepCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border-l-4 border-l-accent bg-card p-4 shadow-sm">
      {icon && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button asChild size="sm" className="shrink-0">
        <Link to={to}>
          {actionLabel ?? title}
          <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
