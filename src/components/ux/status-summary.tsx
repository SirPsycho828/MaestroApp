interface StatusItem {
  label: string;
  value: string | number;
  detail?: string;
}

interface StatusSummaryProps {
  items: StatusItem[];
}

export function StatusSummary({ items }: StatusSummaryProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:flex md:items-center md:divide-x md:divide-border">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col md:px-6 first:md:pl-0 last:md:pr-0"
        >
          <span className="font-serif text-2xl font-semibold">
            {item.value}
          </span>
          <span className="text-sm text-muted-foreground">{item.label}</span>
          {item.detail && (
            <span className="text-xs text-muted-foreground">{item.detail}</span>
          )}
        </div>
      ))}
    </div>
  );
}
