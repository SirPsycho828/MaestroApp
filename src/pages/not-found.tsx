import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/animated";
import { Music } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <FadeIn>
        <Music className="mx-auto h-10 w-10 text-primary/30" />
        <h1 className="mt-6 font-serif text-6xl font-bold text-foreground">404</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          This page doesn&apos;t exist — like a rest that lasts forever.
        </p>
        <Button asChild className="mt-8">
          <Link to="/">Back to home</Link>
        </Button>
      </FadeIn>
    </div>
  );
}
