import { BrowserRouter, Routes, Route } from "react-router";
import { AuthProvider } from "@/contexts/auth-context";
import { AuthGuard } from "@/components/auth/auth-guard";
import { RoleGuard } from "@/components/auth/role-guard";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";

import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import RegisterTeacherPage from "@/pages/register-teacher";
import NotFoundPage from "@/pages/not-found";
import TeacherDashboard from "@/pages/teacher/dashboard";
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

          {/* Authenticated routes with app shell */}
          <Route element={<AuthGuard />}>
            <Route element={<AppShell />}>
              {/* Teacher-only routes */}
              <Route element={<RoleGuard role="teacher" />}>
                <Route path="/dashboard" element={<TeacherDashboard />} />
              </Route>

              {/* Student-only routes */}
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
