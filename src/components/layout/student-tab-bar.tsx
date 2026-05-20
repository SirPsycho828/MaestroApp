import { NavLink } from "react-router";
import { Home, CalendarPlus, CheckSquare, CreditCard, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const tabItems = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/book", label: "Book", icon: CalendarPlus },
  { to: "/practice", label: "Practice", icon: CheckSquare },
  { to: "/credits", label: "Credits", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function StudentTabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border bg-card/95 backdrop-blur-xl">
      {tabItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
              isActive ? "text-accent" : "text-muted-foreground"
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <div className="absolute top-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-accent" />
              )}
              <item.icon className="h-5 w-5" />
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
