import React, { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import MobileBottomNav from "@/components/MobileBottomNav";
import {
  Bell,
  LogOut,
  Map as MapIcon,
  LayoutDashboard,
  PawPrint,
  PlusCircle,
  Search,
  ShieldCheck,
  User,
  Menu,
  X,
  ShieldAlert,
} from "lucide-react";

const linkBase =
  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150";

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { unread, requestPermission } = useNotifications(user);
  const [permState, setPermState] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  useEffect(() => {
    if (permState === "default") {
      // Polite prompt — only on first interaction inside an authenticated page
      const t = setTimeout(() => {
        requestPermission().then((res) => setPermState(res));
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [permState, requestPermission]);

  const nav = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/reports", label: "Browse", icon: Search },
    { to: "/map", label: "Map", icon: MapIcon },
    { to: "/my-reports", label: "My Reports", icon: User },
    { to: "/notifications", label: "Alerts", icon: Bell, badge: unread },
  ];
  if (user?.role === "ngo" || user?.role === "admin") {
    nav.push({ to: "/ngo", label: "NGO", icon: ShieldCheck });
  }
  if (user?.role === "admin") {
    nav.push({ to: "/admin", label: "Admin", icon: ShieldAlert });
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-20 md:pb-0">
      <header
        data-testid="app-header"
        className="sticky top-0 z-30 backdrop-blur-xl bg-[#FDFBF7]/80 border-b border-[#EAE5D9]"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              to="/dashboard"
              data-testid="brand-link"
              className="flex items-center gap-2"
            >
              <div className="h-8 w-8 rounded-md bg-[#E06A4F] flex items-center justify-center">
                <PawPrint className="h-4 w-4 text-white" strokeWidth={2.4} />
              </div>
              <span className="font-display font-black text-lg tracking-tight text-[#1A2F24]">
                Findr
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {nav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={({ isActive }) =>
                    `${linkBase} relative ${
                      isActive
                        ? "bg-[#1A2F24] text-[#FDFBF7]"
                        : "text-[#1A2F24]/80 hover:bg-[#F4F1EA]"
                    }`
                  }
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                  {n.badge > 0 && (
                    <span
                      className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E06A4F] text-[10px] font-bold text-white flex items-center justify-center"
                      data-testid={`nav-badge-${n.label.toLowerCase()}`}
                    >
                      {n.badge > 9 ? "9+" : n.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-1.5">
              {/* Mobile alerts shortcut with badge */}
              <Link
                to="/notifications"
                className="relative md:hidden p-2 rounded-md hover:bg-[#F4F1EA]"
                data-testid="mobile-bell-button"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5 text-[#1A2F24]" />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#E06A4F] text-[10px] font-bold text-white flex items-center justify-center">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <Button
                onClick={() => navigate("/report/lost")}
                className="hidden sm:inline-flex bg-[#E06A4F] hover:bg-[#C95B42] text-white rounded-md"
                data-testid="cta-report-lost"
              >
                <PlusCircle className="h-4 w-4 mr-1" />
                Report
              </Button>
              <button
                onClick={() => navigate("/profile")}
                data-testid="profile-button"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm text-[#4A5F54] hover:bg-[#F4F1EA] transition-colors"
                aria-label="Profile"
              >
                <User className="h-4 w-4" />
                {user?.name?.split(" ")[0] || "Me"}
              </button>
              <button
                onClick={logout}
                data-testid="logout-button"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm text-[#4A5F54] hover:bg-[#F4F1EA] transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
              <button
                onClick={() => setOpen(!open)}
                data-testid="mobile-menu-toggle"
                className="md:hidden p-2 rounded-md hover:bg-[#F4F1EA]"
                aria-label="Menu"
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
          {open && (
            <div
              data-testid="mobile-menu"
              className="md:hidden flex flex-col gap-1 pb-4"
            >
              {nav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `${linkBase} ${
                      isActive
                        ? "bg-[#1A2F24] text-[#FDFBF7]"
                        : "text-[#1A2F24]/80 hover:bg-[#F4F1EA]"
                    }`
                  }
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                  {n.badge > 0 && (
                    <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-[#E06A4F] text-[10px] font-bold text-white flex items-center justify-center">
                      {n.badge > 9 ? "9+" : n.badge}
                    </span>
                  )}
                </NavLink>
              ))}
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/profile");
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[#4A5F54]"
                data-testid="mobile-profile-button"
              >
                <User className="h-4 w-4" />
                Profile
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[#4A5F54]"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </header>
      <main>{children}</main>
      <MobileBottomNav unread={unread} />
    </div>
  );
}
