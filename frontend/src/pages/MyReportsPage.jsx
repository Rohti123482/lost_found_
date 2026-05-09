import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import ReportCard from "@/components/ReportCard";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export default function MyReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .get("/reports/me/list")
      .then((r) => setReports(r.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id) {
    if (!window.confirm("Delete this report?")) return;
    await api.delete(`/reports/${id}`);
    load();
  }

  async function markResolved(id) {
    await api.put(`/reports/${id}`, { status: "resolved" });
    load();
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight">
              My reports
            </h1>
            <p className="text-[#4A5F54] mt-2">Edit, mark as resolved, or remove.</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/report/lost"
              className="px-4 py-2 rounded-md bg-[#E06A4F] hover:bg-[#C95B42] text-white text-sm font-semibold"
              data-testid="my-reports-new-lost"
            >
              + Lost
            </Link>
            <Link
              to="/report/found"
              className="px-4 py-2 rounded-md bg-[#7D9774] hover:bg-[#6B8562] text-white text-sm font-semibold"
              data-testid="my-reports-new-found"
            >
              + Found
            </Link>
          </div>
        </div>
        {loading ? (
          <div className="mt-10 text-[#8A9A92]">Loading…</div>
        ) : reports.length === 0 ? (
          <div className="bento-card p-12 mt-8 text-center" data-testid="my-reports-empty">
            <p className="text-[#4A5F54]">You haven't posted any reports yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8" data-testid="my-reports-grid">
            {reports.map((r) => (
              <ReportCard
                key={r.id}
                report={r}
                onAction={(rep) => (
                  <div className="flex gap-2 mt-3">
                    {rep.status !== "resolved" && (
                      <Button
                        size="sm"
                        onClick={() => markResolved(rep.id)}
                        className="bg-[#7D9774] hover:bg-[#6B8562] text-white"
                        data-testid={`mark-resolved-${rep.id}`}
                      >
                        Mark resolved
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => remove(rep.id)}
                      data-testid={`delete-report-${rep.id}`}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </div>
                )}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
