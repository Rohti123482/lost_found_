import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  PlusCircle,
  Bell,
  User,
  Map as MapIcon,
} from "lucide-react";

const items = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/reports", label: "Browse", icon: Search },
  { to: "/report/lost", label: "Report", icon: PlusCircle, accent: true },
  { to: "/map", label: "Map", icon: MapIcon },
  { to: "/notifications", label: "Alerts", icon: Bell },
];

export default function MobileBottomNav({ unread = 0 }) {
  return (
    <nav
      data-testid="mobile-bottom-nav"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#FDFBF7]/95 backdrop-blur-xl border-t border-[#EAE5D9]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {items.map((it) => (
          <li key={it.to}>
            <NavLink
              to={it.to}
              data-testid={`mobile-nav-${it.label.toLowerCase()}`}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center py-2.5 text-[11px] font-medium transition-colors ${
                  isActive ? "text-[#E06A4F]" : "text-[#4A5F54] hover:text-[#1A2F24]"
                }`
              }
            >
              {it.accent ? (
                <div className="h-9 w-9 rounded-full bg-[#E06A4F] flex items-center justify-center -mt-3 shadow-md">
                  <it.icon className="h-5 w-5 text-white" />
                </div>
              ) : (
                <it.icon className="h-5 w-5" />
              )}
              <span className="mt-0.5">{it.label}</span>
              {it.label === "Alerts" && unread > 0 && (
                <span
                  className="absolute top-1 right-[26%] min-w-[16px] h-4 px-1 rounded-full bg-[#E06A4F] text-[10px] font-bold text-white flex items-center justify-center"
                  data-testid="mobile-unread-badge"
                >
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
