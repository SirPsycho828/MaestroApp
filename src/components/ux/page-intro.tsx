export function PageIntro({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-2xl text-sm text-muted-foreground">{children}</p>
  );
}
