import { Link } from "react-router";
import { LoginForm } from "@/components/auth/login-form";
import { AuthLayout } from "@/components/auth/auth-layout";

export default function LoginPage() {
  return (
    <AuthLayout heading="Welcome back" subheading="Sign in to your TuneFolio account">
      <LoginForm />
      <p className="mt-6 text-center text-sm text-muted-foreground lg:text-left">
        New teacher?{" "}
        <Link to="/register/teacher" className="font-medium text-accent hover:underline">
          Create an account
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-muted-foreground lg:text-left">
        Student? Ask your teacher for an invite link to get started.
      </p>
    </AuthLayout>
  );
}
