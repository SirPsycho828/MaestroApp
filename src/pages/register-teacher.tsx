import { Link } from "react-router";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterTeacherPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-50 px-4">
      <RegisterForm />
      <p className="mt-4 text-sm text-brand-400">
        Already have an account?{" "}
        <Link to="/login" className="text-accent-500 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
