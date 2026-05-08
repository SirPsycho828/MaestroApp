import { useAuth } from "@/contexts/auth-context";

export default function StudentHome() {
  const { userDoc } = useAuth();

  return (
    <div>
      <h1>Home</h1>
      <p className="mt-2 text-brand-400">
        Welcome{userDoc?.displayName ? `, ${userDoc.displayName}` : ""}. Your
        student dashboard is coming soon.
      </p>
    </div>
  );
}
