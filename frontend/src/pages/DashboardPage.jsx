import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import ReportCard from "@/components/ReportCard";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Sparkles, MapPin, Bell } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  useEffect(() => {
    api.get("/stats").then((r) => setStats(r.data));
    api.get("/reports", { params: { limit: 6 } }).then((r) => setRecent(r.data));
    api
      .get("/notifications")
      .then((r) => setUnreadAlerts(r.data.filter((n) => !n.is_read).length));
  }, []);

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#7D9774] font-semibold">
              {user?.role === "ngo" ? "NGO console" : "Community"}
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-black mt-2">
              Hi {user?.name?.split(" ")[0] || "friend"} —
              <span className="text-[#E06A4F]"> let's bring someone home.</span>
            </h1>
          </div>
          <div className="flex gap-3">
            <Link
              to="/report/lost"
              data-testid="dashboard-report-lost"
              className="px-5 py-2.5 rounded-md bg-[#E06A4F] hover:bg-[#C95B42] text-white text-sm font-semibold transition-colors"
            >
              Report Lost
            </Link>
            <Link
              to="/report/found"
              data-testid="dashboard-report-found"
              className="px-5 py-2.5 rounded-md bg-[#7D9774] hover:bg-[#6B8562] text-white text-sm font-semibold transition-colors"
            >
              Report Found
            </Link>
          </div>
        </div>

        {/* Stats Bento */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
          <StatCard label="Active reports" value={stats?.total_reports ?? "—"} accent="#1A2F24" testid="stat-total" />
          <StatCard label="Lost" value={stats?.lost ?? "—"} accent="#E06A4F" testid="stat-lost" />
          <StatCard label="Found" value={stats?.found ?? "—"} accent="#7D9774" testid="stat-found" />
          <StatCard label="Resolved" value={stats?.resolved ?? "—"} accent="#669BBC" testid="stat-resolved" />
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
          <QuickLink
            to="/reports"
            icon={Sparkles}
            color="#E06A4F"
            title="Browse reports"
            sub="Filter by species, colour, distance"
            testid="quicklink-browse"
          />
          <QuickLink
            to="/map"
            icon={MapPin}
            color="#7D9774"
            title="Open the live map"
            sub="See pins around your location"
            testid="quicklink-map"
          />
          <QuickLink
            to="/notifications"
            icon={Bell}
            color="#E2B15B"
            title={`Alerts ${unreadAlerts ? `(${unreadAlerts} new)` : ""}`}
            sub="Match notifications and nearby alerts"
            testid="quicklink-alerts"
          />
        </div>

        {/* Recent reports */}
        <div className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Recent reports
            </h2>
            <Link
              to="/reports"
              data-testid="dashboard-view-all"
              className="text-sm font-semibold text-[#E06A4F] hover:text-[#C95B42] flex items-center gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="bento-card p-12 text-center mt-6">
              <p className="text-[#4A5F54]">
                No reports yet. Be the first to post one.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {recent.map((r) => (
                <ReportCard key={r.id} report={r} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({ label, value, accent, testid }) {
  return (
    <div
      className="bento-card p-6"
      data-testid={testid}
      style={{ borderTop: `3px solid ${accent}` }}
    >
      <div className="text-xs uppercase tracking-[0.2em] text-[#8A9A92]">{label}</div>
      <div className="font-display font-black text-4xl mt-2 text-[#1A2F24]">{value}</div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, color, title, sub, testid }) {
  return (
    <Link to={to} data-testid={testid} className="bento-card p-6 group">
      <div
        className="h-10 w-10 rounded-md flex items-center justify-center"
        style={{ background: `${color}1a` }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="mt-4 font-display font-bold text-lg">{title}</div>
      <p className="text-sm text-[#4A5F54] mt-1">{sub}</p>
      <ArrowRight className="h-4 w-4 mt-4 text-[#8A9A92] group-hover:text-[#E06A4F] transition-colors" />
    </Link>
  );
}
