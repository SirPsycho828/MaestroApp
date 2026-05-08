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
    <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border bg-card/90 backdrop-blur-xl">
      {tabItems.map((item) => (
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
  );
}
