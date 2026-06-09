import { NavLink } from "react-router";
import {
  LayoutDashboard,
  Users,
  Calendar,
  BookOpen,
  ListMusic,
  MapPin,
  DollarSign,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { WaveformLogo } from "@/components/ui/waveform-logo";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, tourId: "dashboard" },
  { to: "/students", label: "Students", icon: Users, tourId: "students" },
  { to: "/availability", label: "Availability", icon: Calendar, tourId: "availability" },
  { to: "/lessons", label: "Lessons", icon: BookOpen, tourId: "lessons" },
  { to: "/lesson-types", label: "Lesson Types", icon: ListMusic, tourId: "lesson-types" },
  { to: "/settings/locations", label: "Locations", icon: MapPin },
  { to: "/settings/pricing", label: "Pricing", icon: DollarSign, tourId: "pricing" },
  { to: "/settings", label: "Settings", icon: Settings, tourId: "settings" },
];

export function TeacherSidebar() {
  const { signOut } = useAuth();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-sidebar-border lg:bg-sidebar">
        <div className="flex h-16 items-center gap-2.5 px-6">
          <WaveformLogo className="h-5 w-5 text-accent" />
          <span className="font-serif text-lg font-semibold text-sidebar-foreground">
            TuneFolio
          </span>
        </div>

        {/* Sound-wave divider */}
        <div className="mx-6 mb-3 flex items-end gap-[4px] opacity-[0.06]">
          {[4, 10, 16, 22, 16, 10, 4].map((h, i) => (
            <div key={i} className="w-[2px] rounded-full bg-sidebar-foreground" style={{ height: h }} />
          ))}
        </div>

        <nav className="flex-1 space-y-0.5 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-tour={item.tourId}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-foreground"
                    : "text-sidebar-foreground/55 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
                  )}
                  <item.icon className={cn("h-[18px] w-[18px]", isActive && "text-accent")} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center justify-between px-3">
            <button
              onClick={signOut}
              className="flex items-center gap-3 rounded-md py-2 text-sm font-medium text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground"
            >
              <LogOut className="h-[18px] w-[18px]" />
              Sign out
            </button>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border bg-card/95 backdrop-blur-xl lg:hidden">
        {navItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                isActive ? "text-accent" : "text-muted-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
