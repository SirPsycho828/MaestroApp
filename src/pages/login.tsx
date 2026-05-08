import { Link } from "react-router";
import { LoginForm } from "@/components/auth/login-form";
import { FadeIn } from "@/components/ui/animated";
import { Music } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="pointer-events-none fixed left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2">
        <div className="h-[400px] w-[400px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <FadeIn className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <Music className="h-8 w-8 text-primary" />
            <span className="font-serif text-2xl font-bold">TuneFolio</span>
          </Link>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New teacher?{" "}
          <Link to="/register/teacher" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Student? Ask your teacher for an invite link to get started.
        </p>
      </FadeIn>
    </div>
  );
}
