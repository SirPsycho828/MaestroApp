import { Link } from "react-router";
import { RegisterForm } from "@/components/auth/register-form";
import { AuthLayout } from "@/components/auth/auth-layout";

export default function RegisterTeacherPage() {
  return (
    <AuthLayout heading="Create your teacher account" subheading="Set up your studio on TuneFolio">
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-muted-foreground lg:text-left">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
