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
import InvitePage from "@/pages/invite";
import RegisterStudentPage from "@/pages/register-student";
import NotFoundPage from "@/pages/not-found";
import TeacherDashboard from "@/pages/teacher/dashboard";
import SetupPage from "@/pages/teacher/setup";
import LessonTypesPage from "@/pages/teacher/settings/lesson-types";
import LocationsPage from "@/pages/teacher/settings/locations";
import StudentsPage from "@/pages/teacher/students";
import StudentHome from "@/pages/student/home";
import BookPage from "@/pages/student/book";
import AvailabilityPage from "@/pages/teacher/availability";
import SchedulePage from "@/pages/teacher/schedule";
import StripeSetupPage from "@/pages/stripe/setup";
import StripeCallbackPage from "@/pages/stripe/callback";
import PricingPage from "@/pages/teacher/settings/pricing";
import CreditsPage from "@/pages/student/credits";
import CreditsBuyPage from "@/pages/student/credits-buy";
import CreditsSuccessPage from "@/pages/student/credits-success";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register/teacher" element={<RegisterTeacherPage />} />
          <Route path="/invite/:token" element={<InvitePage />} />
          <Route path="/register/student" element={<RegisterStudentPage />} />

          {/* Authenticated routes */}
          <Route element={<AuthGuard />}>
            {/* Setup wizard + Stripe onboarding (no app shell, no setup guard) */}
            <Route element={<RoleGuard role="teacher" />}>
              <Route path="/setup" element={<SetupPage />} />
              <Route path="/stripe/setup" element={<StripeSetupPage />} />
              <Route path="/stripe/callback" element={<StripeCallbackPage />} />
            </Route>

            {/* Standalone student flows (no app shell) */}
            <Route element={<RoleGuard role="student" />}>
              <Route path="/book/:teacherSlug" element={<BookPage />} />
              <Route path="/credits/buy" element={<CreditsBuyPage />} />
              <Route path="/credits/success" element={<CreditsSuccessPage />} />
            </Route>

            {/* Main app with shell (requires setup complete) */}
            <Route element={<AppShell />}>
              {/* Teacher routes */}
              <Route element={<RoleGuard role="teacher" />}>
                <Route element={<SetupGuard />}>
                  <Route path="/dashboard" element={<TeacherDashboard />} />
                  <Route path="/students" element={<StudentsPage />} />
                  <Route path="/lesson-types" element={<LessonTypesPage />} />
                  <Route path="/settings/locations" element={<LocationsPage />} />
                  <Route path="/availability" element={<AvailabilityPage />} />
                  <Route path="/lessons" element={<SchedulePage />} />
                  <Route path="/settings/pricing" element={<PricingPage />} />
                </Route>
              </Route>

              {/* Student routes */}
              <Route element={<RoleGuard role="student" />}>
                <Route path="/home" element={<StudentHome />} />
                <Route path="/credits" element={<CreditsPage />} />
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
