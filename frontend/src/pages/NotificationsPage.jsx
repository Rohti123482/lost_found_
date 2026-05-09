import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { Bell, MapPin, Sparkles, ShieldCheck, Check } from "lucide-react";

const TYPE_META = {
  match: { color: "#E06A4F", icon: Sparkles, label: "Match" },
  nearby: { color: "#669BBC", icon: MapPin, label: "Nearby" },
  ngo_update: { color: "#7D9774", icon: ShieldCheck, label: "NGO" },
};

export default function NotificationsPage() {
  const [items, setItems] = useState([]);

  function load() {
    api.get("/notifications").then((r) => setItems(r.data));
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(id) {
    await api.post(`/notifications/${id}/read`);
    load();
  }
  async function markAll() {
    await api.post("/notifications/read-all");
    load();
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight flex items-center gap-3">
              <Bell className="h-7 w-7 text-[#E2B15B]" /> Alerts
            </h1>
            <p className="text-[#4A5F54] mt-2">
              Match notifications, nearby reports, and NGO updates.
            </p>
          </div>
          <button
            onClick={markAll}
            className="text-sm font-semibold text-[#7D9774] hover:text-[#6B8562]"
            data-testid="mark-all-read-button"
          >
            Mark all read
          </button>
        </div>
        {items.length === 0 ? (
          <div className="bento-card p-12 mt-8 text-center" data-testid="notifications-empty">
            <p className="text-[#4A5F54]">No alerts yet. Set your area to receive nearby pings.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-3" data-testid="notifications-list">
            {items.map((n) => {
              const meta = TYPE_META[n.type] || TYPE_META.nearby;
              const Icon = meta.icon;
              return (
                <div
                  key={n.id}
                  className={`bento-card p-5 flex gap-4 ${
                    !n.is_read ? "ring-1 ring-[#E06A4F]/30" : ""
                  }`}
                  data-testid={`notification-${n.id}`}
                >
                  <div
                    className="h-10 w-10 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: `${meta.color}1a` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-[#8A9A92]">
                        {meta.label}
                      </span>
                      {!n.is_read && (
                        <span className="h-2 w-2 rounded-full bg-[#E06A4F]" />
                      )}
                    </div>
                    <div className="font-display font-bold text-[#1A2F24] mt-1">
                      {n.title}
                    </div>
                    <p className="text-sm text-[#4A5F54] mt-1">{n.body}</p>
                    <div className="mt-3 flex gap-3 text-sm">
                      {n.related_report_id && (
                        <Link
                          to={`/reports/${n.related_report_id}`}
                          className="text-[#E06A4F] hover:text-[#C95B42] font-semibold"
                          data-testid={`notif-view-${n.id}`}
                        >
                          View match →
                        </Link>
                      )}
                      {n.report_id && !n.related_report_id && (
                        <Link
                          to={`/reports/${n.report_id}`}
                          className="text-[#E06A4F] hover:text-[#C95B42] font-semibold"
                          data-testid={`notif-view-${n.id}`}
                        >
                          View report →
                        </Link>
                      )}
                      {!n.is_read && (
                        <button
                          onClick={() => markRead(n.id)}
                          className="text-[#8A9A92] hover:text-[#1A2F24] flex items-center gap-1"
                          data-testid={`notif-read-${n.id}`}
                        >
                          <Check className="h-3 w-3" /> Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
