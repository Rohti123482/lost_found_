import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, fileUrl } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldCheck } from "lucide-react";

const STATUSES = ["claimed", "sheltered", "reunified", "closed"];

export default function NgoDashboardPage() {
  const [cases, setCases] = useState([]);
  const [openCases, setOpenCases] = useState([]);

  function load() {
    api.get("/ngo/cases").then((r) => setCases(r.data));
    api
      .get("/reports", { params: { report_type: "found", limit: 30 } })
      .then((r) => setOpenCases(r.data));
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(caseId, status) {
    await api.post(`/ngo/cases/${caseId}/status`, { status });
    load();
  }

  async function claim(reportId) {
    await api.post(`/ngo/cases/${reportId}/claim`);
    load();
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <p className="text-xs uppercase tracking-[0.3em] text-[#7D9774] font-semibold">
          Coordination
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-black mt-2 flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-[#7D9774]" /> NGO Dashboard
        </h1>
        <p className="text-[#4A5F54] mt-2 max-w-2xl">
          Claim found reports, coordinate shelters, drive cases to reunification.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
          {/* Active cases */}
          <section data-testid="ngo-active-cases">
            <h2 className="font-display text-xl font-bold">Active cases</h2>
            {cases.length === 0 ? (
              <div className="bento-card p-8 mt-4 text-center text-[#4A5F54]" data-testid="ngo-cases-empty">
                You haven't claimed any cases yet.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {cases.map((c) => (
                  <div key={c.id} className="bento-card p-5" data-testid={`ngo-case-${c.id}`}>
                    <div className="flex gap-4">
                      <div className="h-20 w-20 shrink-0 rounded-md overflow-hidden bg-[#F4F1EA]">
                        {c.report?.photo_urls?.[0] && (
                          <img
                            src={fileUrl(c.report.photo_urls[0])}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-md"
                            style={{
                              background: STATUS_COLOR[c.status] + "1a",
                              color: STATUS_COLOR[c.status],
                            }}
                          >
                            {c.status}
                          </span>
                        </div>
                        <Link
                          to={`/reports/${c.report_id}`}
                          className="font-display font-bold text-lg block mt-1 hover:text-[#E06A4F]"
                        >
                          {c.report?.name || c.report?.entity_type || "Case"}
                        </Link>
                        <p className="text-sm text-[#4A5F54] line-clamp-2">
                          {c.report?.description}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-[#8A9A92]">Update status:</span>
                      <Select onValueChange={(v) => setStatus(c.id, v)}>
                        <SelectTrigger className="w-44" data-testid={`status-select-${c.id}`}>
                          <SelectValue placeholder={c.status} />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s} data-testid={`status-option-${s}`}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Open found reports to claim */}
          <section data-testid="ngo-open-reports">
            <h2 className="font-display text-xl font-bold">Open found reports</h2>
            {openCases.length === 0 ? (
              <div className="bento-card p-8 mt-4 text-center text-[#4A5F54]">
                No open found reports right now.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {openCases.slice(0, 10).map((r) => (
                  <div key={r.id} className="bento-card p-4 flex gap-3" data-testid={`open-report-${r.id}`}>
                    <div className="h-16 w-16 shrink-0 rounded-md overflow-hidden bg-[#F4F1EA]">
                      {r.photo_urls?.[0] && (
                        <img
                          src={fileUrl(r.photo_urls[0])}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/reports/${r.id}`}
                        className="font-display font-bold truncate block hover:text-[#E06A4F]"
                      >
                        {r.name || r.entity_type}
                      </Link>
                      <p className="text-xs text-[#8A9A92] truncate">
                        {r.color} · {r.location_text}
                      </p>
                    </div>
                    <Button
                      onClick={() => claim(r.id)}
                      className="bg-[#7D9774] hover:bg-[#6B8562] text-white shrink-0"
                      data-testid={`claim-${r.id}`}
                    >
                      Claim
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

const STATUS_COLOR = {
  claimed: "#669BBC",
  sheltered: "#E2B15B",
  reunified: "#7D9774",
  closed: "#1A2F24",
};
