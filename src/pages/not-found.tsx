import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/animated";
import { WaveformLogo } from "@/components/ui/waveform-logo";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="pointer-events-none fixed left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2">
        <div className="h-[400px] w-[400px] rounded-full bg-accent/[0.04] blur-[100px]" />
      </div>

      <FadeIn className="relative z-10">
        <WaveformLogo className="mx-auto h-10 w-10 text-accent/30" />
        <h1 className="mt-6 font-serif text-7xl font-semibold text-foreground">404</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          This page doesn&apos;t exist — like a rest that lasts forever.
        </p>
        <Button asChild className="mt-8">
          <Link to="/">Back to home</Link>
        </Button>
      </FadeIn>
    </div>
  );
}
