import { Outlet } from "react-router";
import { useAuth } from "@/contexts/auth-context";
import { TeacherSidebar } from "./teacher-sidebar";
import { StudentTabBar } from "./student-tab-bar";

export function AppShell() {
  const { role } = useAuth();

  if (role === "teacher") {
    return (
      <div className="flex min-h-screen">
        <TeacherSidebar />
        <main className="flex-1 pb-16 lg:pb-0">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    );
  }

  // Student layout
  return (
    <div className="min-h-screen">
      <main className="pb-20">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <Outlet />
        </div>
      </main>
      <StudentTabBar />
    </div>
  );
}
