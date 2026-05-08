import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-50 px-4 text-center">
      <h1>404</h1>
      <p className="mt-2 text-brand-400">Page not found</p>
      <Button asChild className="mt-6 bg-accent-500 hover:bg-accent-600">
        <Link to="/">Go home</Link>
      </Button>
    </div>
  );
}
