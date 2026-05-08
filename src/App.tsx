import { BrowserRouter, Routes, Route } from "react-router";
import { AuthProvider } from "@/contexts/auth-context";
import { AuthGuard } from "@/components/auth/auth-guard";
import { RoleGuard } from "@/components/auth/role-guard";
import { SetupGuard } from "@/components/setup/setup-guard";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";

import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import RegisterTeacherPage from "@/pages/register-teacher";
import NotFoundPage from "@/pages/not-found";
import TeacherDashboard from "@/pages/teacher/dashboard";
import SetupPage from "@/pages/teacher/setup";
import LessonTypesPage from "@/pages/teacher/settings/lesson-types";
import LocationsPage from "@/pages/teacher/settings/locations";
import StudentHome from "@/pages/student/home";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register/teacher" element={<RegisterTeacherPage />} />

          {/* Authenticated routes */}
          <Route element={<AuthGuard />}>
            {/* Setup wizard (no app shell, no setup guard) */}
            <Route element={<RoleGuard role="teacher" />}>
              <Route path="/setup" element={<SetupPage />} />
            </Route>

            {/* Main app with shell (requires setup complete) */}
            <Route element={<AppShell />}>
              {/* Teacher routes */}
              <Route element={<RoleGuard role="teacher" />}>
                <Route element={<SetupGuard />}>
                  <Route path="/dashboard" element={<TeacherDashboard />} />
                  <Route path="/lesson-types" element={<LessonTypesPage />} />
                  <Route path="/settings/locations" element={<LocationsPage />} />
                </Route>
              </Route>

              {/* Student routes */}
              <Route element={<RoleGuard role="student" />}>
                <Route path="/home" element={<StudentHome />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Toaster position="bottom-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}
