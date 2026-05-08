import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Music } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-50 px-4 text-center">
      <Music className="h-12 w-12 text-accent-500" />
      <h1 className="mt-4">TuneFolio</h1>
      <p className="mt-2 max-w-md text-brand-400">
        Lesson management for independent music teachers. Schedule lessons,
        manage students, and handle payments — all in one place.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild className="bg-accent-500 hover:bg-accent-600">
          <Link to="/register/teacher">Get started</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}
