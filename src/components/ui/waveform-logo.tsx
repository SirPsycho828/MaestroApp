export function WaveformLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="2" y="9" width="2.5" height="6" rx="1.25" fill="currentColor" />
      <rect x="6.5" y="5" width="2.5" height="14" rx="1.25" fill="currentColor" />
      <rect x="11" y="2" width="2.5" height="20" rx="1.25" fill="currentColor" />
      <rect x="15.5" y="6" width="2.5" height="12" rx="1.25" fill="currentColor" />
      <rect x="20" y="8" width="2.5" height="8" rx="1.25" fill="currentColor" />
    </svg>
  );
}
