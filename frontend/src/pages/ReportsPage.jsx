import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import ReportCard from "@/components/ReportCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Crosshair, Search } from "lucide-react";

const ENTITY_TYPES = ["any", "dog", "cat", "bird", "pet-other", "person", "object"];
const REPORT_TYPES = ["any", "lost", "found"];

export default function ReportsPage() {
  const [filters, setFilters] = useState({
    q: "",
    report_type: "any",
    entity_type: "any",
    color: "",
    radius_km: "",
  });
  const [userLoc, setUserLoc] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  function setF(k, v) {
    setFilters((s) => ({ ...s, [k]: v }));
  }

  function fetchReports() {
    setLoading(true);
    const params = {};
    if (filters.q) params.q = filters.q;
    if (filters.report_type !== "any") params.report_type = filters.report_type;
    if (filters.entity_type !== "any") params.entity_type = filters.entity_type;
    if (filters.color) params.color = filters.color;
    if (userLoc) {
      params.lat = userLoc.lat;
      params.lng = userLoc.lng;
      if (filters.radius_km) params.radius_km = Number(filters.radius_km);
    }
    api
      .get("/reports", { params })
      .then((r) => setReports(r.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function detectLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) =>
      setUserLoc({ lat: p.coords.latitude, lng: p.coords.longitude })
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight">
          Browse reports
        </h1>
        <p className="text-[#4A5F54] mt-2 max-w-2xl">
          Filter by type, colour, keyword or distance from your location.
        </p>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-3 bento-card p-6 h-fit lg:sticky lg:top-24" data-testid="filters-sidebar">
            <div className="space-y-4">
              <div>
                <Label htmlFor="filter-q">Keyword</Label>
                <div className="relative mt-1">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-[#8A9A92]" />
                  <Input
                    id="filter-q"
                    value={filters.q}
                    onChange={(e) => setF("q", e.target.value)}
                    className="pl-9"
                    data-testid="filter-keyword"
                    placeholder="brown labrador"
                  />
                </div>
              </div>
              <div>
                <Label>Report type</Label>
                <Select
                  value={filters.report_type}
                  onValueChange={(v) => setF("report_type", v)}
                >
                  <SelectTrigger className="mt-1" data-testid="filter-report-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Entity type</Label>
                <Select
                  value={filters.entity_type}
                  onValueChange={(v) => setF("entity_type", v)}
                >
                  <SelectTrigger className="mt-1" data-testid="filter-entity-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="filter-color">Color</Label>
                <Input
                  id="filter-color"
                  value={filters.color}
                  onChange={(e) => setF("color", e.target.value)}
                  className="mt-1"
                  data-testid="filter-color"
                />
              </div>
              <div>
                <Label htmlFor="filter-radius">Radius (km)</Label>
                <Input
                  id="filter-radius"
                  value={filters.radius_km}
                  onChange={(e) => setF("radius_km", e.target.value)}
                  className="mt-1"
                  type="number"
                  data-testid="filter-radius"
                  placeholder="e.g. 10"
                />
                <button
                  type="button"
                  onClick={detectLocation}
                  className="text-xs text-[#7D9774] hover:text-[#6B8562] mt-1 flex items-center gap-1"
                  data-testid="detect-location-button"
                >
                  <Crosshair className="h-3 w-3" />
                  {userLoc ? "Location detected" : "Use my location"}
                </button>
              </div>
              <Button
                onClick={fetchReports}
                className="w-full bg-[#1A2F24] hover:bg-[#0d1f17] text-white"
                data-testid="apply-filters-button"
              >
                Apply filters
              </Button>
            </div>
          </aside>

          <div className="lg:col-span-9">
            {loading ? (
              <div className="text-[#8A9A92] text-sm" data-testid="reports-loading">
                Loading…
              </div>
            ) : reports.length === 0 ? (
              <div
                className="bento-card p-12 text-center"
                data-testid="reports-empty"
              >
                <p className="text-[#4A5F54]">No reports match your filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6" data-testid="reports-grid">
                {reports.map((r) => (
                  <ReportCard key={r.id} report={r} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
