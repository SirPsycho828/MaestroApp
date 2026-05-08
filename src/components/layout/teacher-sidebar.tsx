import { NavLink } from "react-router";
import {
  LayoutDashboard,
  Users,
  Calendar,
  BookOpen,
  Settings,
  ListMusic,
  MapPin,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/students", label: "Students", icon: Users },
  { to: "/availability", label: "Availability", icon: Calendar },
  { to: "/lessons", label: "Lessons", icon: BookOpen },
  { to: "/lesson-types", label: "Lesson Types", icon: ListMusic },
  { to: "/settings/locations", label: "Locations", icon: MapPin },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function TeacherSidebar() {
  const { signOut } = useAuth();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-brand-200 lg:bg-white">
        <div className="flex h-14 items-center px-6">
          <span className="text-lg font-bold text-brand-800">TuneFolio</span>
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
                    ? "bg-accent-50 text-accent-500"
                    : "text-brand-500 hover:bg-brand-100 hover:text-brand-700"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-brand-200 p-3">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-500 hover:bg-brand-100 hover:text-brand-700"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-brand-200 bg-white lg:hidden">
        {navItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium",
                isActive ? "text-accent-500" : "text-brand-400"
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
