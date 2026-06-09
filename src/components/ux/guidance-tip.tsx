import { useState } from "react";
import { Lightbulb, X } from "lucide-react";

interface GuidanceTipProps {
  id: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function GuidanceTip({ id, children, icon }: GuidanceTipProps) {
  const storageKey = `ux-tip-${id}`;
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(storageKey) === "true"
  );

  if (dismissed) return null;

  function handleDismiss() {
    localStorage.setItem(storageKey, "true");
    setDismissed(true);
  }

  return (
    <div className="flex items-start gap-3 rounded-md border border-brand-200 bg-brand-50 p-3 text-sm dark:border-brand-700 dark:bg-brand-800/50">
      <span className="mt-0.5 shrink-0 text-brand-500 dark:text-brand-300">
        {icon ?? <Lightbulb className="h-4 w-4" />}
      </span>
      <p className="flex-1 text-brand-600 dark:text-brand-200">{children}</p>
      <button
        onClick={handleDismiss}
        className="shrink-0 text-brand-400 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-200"
        aria-label="Dismiss tip"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
