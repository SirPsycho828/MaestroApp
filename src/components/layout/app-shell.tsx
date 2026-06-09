import { Outlet } from "react-router";
import { useAuth } from "@/contexts/auth-context";
import { TourProvider } from "@/contexts/tour-context";
import { TeacherSidebar } from "./teacher-sidebar";
import { StudentTabBar } from "./student-tab-bar";

export function AppShell() {
  const { role } = useAuth();

  if (role === "teacher") {
    return (
      <TourProvider>
        <div className="flex min-h-screen bg-background">
          <TeacherSidebar />
          <main className="flex-1 pb-16 lg:pb-0">
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </main>
        </div>
      </TourProvider>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <Outlet />
        </div>
      </main>
      <StudentTabBar />
    </div>
  );
}
