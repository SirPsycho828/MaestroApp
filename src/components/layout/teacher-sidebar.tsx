import { NavLink } from "react-router";
import {
  LayoutDashboard,
  Users,
  Calendar,
  BookOpen,
  ListMusic,
  MapPin,
  DollarSign,
  LogOut,
  Music,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/students", label: "Students", icon: Users },
  { to: "/availability", label: "Availability", icon: Calendar },
  { to: "/lessons", label: "Lessons", icon: BookOpen },
  { to: "/lesson-types", label: "Lesson Types", icon: ListMusic },
  { to: "/settings/locations", label: "Locations", icon: MapPin },
  { to: "/settings/pricing", label: "Pricing", icon: DollarSign },
];

export function TeacherSidebar() {
  const { signOut } = useAuth();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-sidebar-border lg:bg-sidebar">
        <div className="flex h-16 items-center gap-2 px-6">
          <Music className="h-5 w-5 text-sidebar-primary" />
          <span className="font-serif text-lg font-bold text-sidebar-foreground">
            TuneFolio
          </span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary/10 text-sidebar-primary"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center justify-between px-3">
            <button
              onClick={signOut}
              className="flex items-center gap-3 rounded-lg py-2 text-sm font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Sign out
            </button>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border bg-card/90 backdrop-blur-xl lg:hidden">
        {navItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
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
