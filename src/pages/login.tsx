import { Link } from "react-router";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-50 px-4">
      <LoginForm />
      <p className="mt-4 text-sm text-brand-400">
        New teacher?{" "}
        <Link to="/register/teacher" className="text-accent-500 hover:underline">
          Create an account
        </Link>
      </p>
      <p className="mt-2 text-sm text-brand-400">
        Student? Ask your teacher for an invite link to get started.
      </p>
    </div>
  );
}
