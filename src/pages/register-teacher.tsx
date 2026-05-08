import { Link } from "react-router";
import { RegisterForm } from "@/components/auth/register-form";
import { FadeIn } from "@/components/ui/animated";
import { Music } from "lucide-react";

export default function RegisterTeacherPage() {
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
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </FadeIn>
    </div>
  );
}
