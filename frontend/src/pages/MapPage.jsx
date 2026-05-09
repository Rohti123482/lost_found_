import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import FindrMap from "@/components/FindrMap";
import { Crosshair } from "lucide-react";

export default function MapPage() {
  const [reports, setReports] = useState([]);
  const [userLoc, setUserLoc] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/reports", { params: { limit: 500 } }).then((r) => setReports(r.data));
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setUserLoc({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {}
      );
    }
  }, []);

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight">
              Live map
            </h1>
            <p className="text-[#4A5F54] mt-2 max-w-2xl">
              Terracotta = lost · sage = found. Click a pin for details.
            </p>
          </div>
          <button
            onClick={() => {
              if (navigator.geolocation)
                navigator.geolocation.getCurrentPosition(
                  (p) => setUserLoc({ lat: p.coords.latitude, lng: p.coords.longitude })
                );
            }}
            className="flex items-center gap-1 text-sm text-[#7D9774] hover:text-[#6B8562]"
            data-testid="map-locate-button"
          >
            <Crosshair className="h-4 w-4" /> Recenter on me
          </button>
        </div>
        <div className="mt-6">
          <FindrMap
            reports={reports}
            userLocation={userLoc}
            center={userLoc ? [userLoc.lat, userLoc.lng] : [20.5937, 78.9629]}
            zoom={userLoc ? 12 : 5}
            height={620}
            onMarkerClick={(r) => navigate(`/reports/${r.id}`)}
          />
        </div>
        <div className="flex gap-4 mt-4 text-sm text-[#4A5F54]">
          <Legend color="#E06A4F" label="Lost" />
          <Legend color="#7D9774" label="Found" />
          <Legend color="#669BBC" label="You" />
        </div>
      </div>
    </AppLayout>
  );
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-3 w-3 rounded-full" style={{ background: color }} />
      {label}
    </div>
  );
}
