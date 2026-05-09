import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { api, fileUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Ban, ShieldCheck, ShieldAlert, Trash2, Search } from "lucide-react";

export default function AdminPage() {
  const [tab, setTab] = useState("reports");
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState("");

  function load() {
    api.get("/admin/users").then((r) => setUsers(r.data));
    api.get("/reports", { params: { limit: 500 } }).then((r) => setReports(r.data));
    api.get("/admin/stats").then((r) => setStats(r.data));
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleBan(u) {
    if (!window.confirm(`${u.is_banned ? "Unban" : "Ban"} ${u.email}?`)) return;
    await api.post(`/admin/users/${u.id}/ban`);
    load();
  }

  async function deleteReport(r) {
    if (!window.confirm(`Delete report "${r.name || r.entity_type}"?`)) return;
    await api.delete(`/admin/reports/${r.id}`);
    load();
  }

  const fUsers = users.filter(
    (u) =>
      !filter ||
      u.email.toLowerCase().includes(filter.toLowerCase()) ||
      (u.name || "").toLowerCase().includes(filter.toLowerCase())
  );
  const fReports = reports.filter(
    (r) =>
      !filter ||
      (r.name || "").toLowerCase().includes(filter.toLowerCase()) ||
      (r.entity_type || "").toLowerCase().includes(filter.toLowerCase()) ||
      (r.description || "").toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <p className="text-xs uppercase tracking-[0.3em] text-[#7D9774] font-semibold">
          Moderation
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-black mt-2 flex items-center gap-3 tracking-tight">
          <ShieldAlert className="h-7 w-7 text-[#E06A4F]" /> Admin Panel
        </h1>
        <p className="text-[#4A5F54] mt-2">
          Moderate reports, manage user accounts, and monitor system health.
        </p>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8" data-testid="admin-stats">
            <Stat label="Users" v={stats.total_users} />
            <Stat label="Banned" v={stats.banned_users} accent="#E06A4F" />
            <Stat label="Reports" v={stats.total_reports} />
            <Stat label="Resolved" v={stats.resolved} accent="#7D9774" />
          </div>
        )}

        {/* Tabs */}
        <div className="mt-8 flex items-center gap-2 p-1 bg-[#F4F1EA] rounded-md w-fit">
          <button
            onClick={() => setTab("reports")}
            data-testid="admin-tab-reports"
            className={`px-4 py-2 rounded-md text-sm font-semibold ${
              tab === "reports" ? "bg-white shadow text-[#1A2F24]" : "text-[#4A5F54]"
            }`}
          >
            Reports ({reports.length})
          </button>
          <button
            onClick={() => setTab("users")}
            data-testid="admin-tab-users"
            className={`px-4 py-2 rounded-md text-sm font-semibold ${
              tab === "users" ? "bg-white shadow text-[#1A2F24]" : "text-[#4A5F54]"
            }`}
          >
            Users ({users.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative mt-4 max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-3 text-[#8A9A92]" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9"
            placeholder={tab === "reports" ? "Search reports…" : "Search users…"}
            data-testid="admin-search"
          />
        </div>

        {/* Reports Tab */}
        {tab === "reports" && (
          <div className="mt-6 space-y-3" data-testid="admin-reports-list">
            {fReports.length === 0 && (
              <div className="bento-card p-8 text-center text-[#4A5F54]">
                No reports.
              </div>
            )}
            {fReports.map((r) => (
              <div
                key={r.id}
                className="bento-card p-4 flex gap-3 items-center"
                data-testid={`admin-report-${r.id}`}
              >
                <div className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-md overflow-hidden bg-[#F4F1EA]">
                  {r.photo_urls?.[0] && (
                    <img
                      src={fileUrl(r.photo_urls[0])}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[10px] uppercase tracking-[0.2em] px-1.5 py-0.5 rounded text-white"
                      style={{
                        background: r.report_type === "lost" ? "#E06A4F" : "#7D9774",
                      }}
                    >
                      {r.report_type}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#8A9A92]">
                      {r.status}
                    </span>
                  </div>
                  <Link
                    to={`/reports/${r.id}`}
                    className="font-display font-bold truncate block hover:text-[#E06A4F]"
                  >
                    {r.name || r.entity_type}
                  </Link>
                  <p className="text-xs text-[#8A9A92] truncate">
                    {r.location_text} · {r.contact}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteReport(r)}
                  data-testid={`admin-delete-${r.id}`}
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Users Tab */}
        {tab === "users" && (
          <div className="mt-6 space-y-3" data-testid="admin-users-list">
            {fUsers.map((u) => (
              <div
                key={u.id}
                className="bento-card p-4 flex gap-3 items-center"
                data-testid={`admin-user-${u.id}`}
              >
                <div className="h-10 w-10 rounded-full bg-[#1A2F24] text-[#FDFBF7] flex items-center justify-center font-display font-black uppercase">
                  {(u.name || u.email)[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-bold text-[#1A2F24]">
                      {u.name || u.email}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.2em] px-1.5 py-0.5 rounded bg-[#F4F1EA] text-[#4A5F54]">
                      {u.role}
                    </span>
                    {u.is_banned && (
                      <span className="text-[10px] uppercase tracking-[0.2em] px-1.5 py-0.5 rounded bg-[#E06A4F] text-white">
                        Banned
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#8A9A92] truncate">{u.email}</p>
                </div>
                {u.role !== "admin" && (
                  <Button
                    size="sm"
                    onClick={() => toggleBan(u)}
                    data-testid={`admin-ban-${u.id}`}
                    className={
                      u.is_banned
                        ? "bg-[#7D9774] hover:bg-[#6B8562] text-white"
                        : "bg-[#1A2F24] hover:bg-[#0d1f17] text-white"
                    }
                  >
                    {u.is_banned ? (
                      <>
                        <ShieldCheck className="h-3 w-3 mr-1" /> Unban
                      </>
                    ) : (
                      <>
                        <Ban className="h-3 w-3 mr-1" /> Ban
                      </>
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Stat({ label, v, accent = "#1A2F24" }) {
  return (
    <div className="bento-card p-4" style={{ borderTop: `3px solid ${accent}` }}>
      <div className="text-xs uppercase tracking-[0.2em] text-[#8A9A92]">{label}</div>
      <div className="font-display font-black text-3xl mt-1 text-[#1A2F24]">{v}</div>
    </div>
  );
}
