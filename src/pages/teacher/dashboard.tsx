import { useAuth } from "@/contexts/auth-context";

export default function TeacherDashboard() {
  const { userDoc } = useAuth();

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="mt-2 text-brand-400">
        Welcome{userDoc?.displayName ? `, ${userDoc.displayName}` : ""}. Your
        dashboard is coming soon.
      </p>
    </div>
  );
}
