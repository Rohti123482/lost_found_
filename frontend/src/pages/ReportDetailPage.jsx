import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, fileUrl } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import FindrMap from "@/components/FindrMap";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  Calendar,
  ExternalLink,
  MapPin,
  Phone,
  ShieldCheck,
  Trash2,
  Sparkles,
} from "lucide-react";

export default function ReportDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [matches, setMatches] = useState([]);
  const [activePhoto, setActivePhoto] = useState(0);

  function load() {
    api.get(`/reports/${id}`).then((r) => setReport(r.data));
    api.get(`/reports/${id}/matches`).then((r) => setMatches(r.data));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!report) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-7xl px-6 py-10 text-[#8A9A92]" data-testid="detail-loading">
          Loading…
        </div>
      </AppLayout>
    );
  }

  const isOwner = user?.id === report.user_id;
  const isLost = report.report_type === "lost";
  const accent = isLost ? "#E06A4F" : "#7D9774";

  async function onDelete() {
    if (!window.confirm("Delete this report?")) return;
    await api.delete(`/reports/${id}`);
    navigate("/my-reports");
  }

  async function onClaim() {
    await api.post(`/ngo/cases/${id}/claim`);
    alert("Case claimed. Manage it from the NGO dashboard.");
    navigate("/ngo");
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7">
            {/* Gallery */}
            <div className="bento-card overflow-hidden">
              <div className="aspect-[16/10] bg-[#F4F1EA]">
                {report.photo_urls?.length ? (
                  <img
                    src={fileUrl(report.photo_urls[activePhoto])}
                    alt="cover"
                    className="w-full h-full object-cover"
                    data-testid="detail-cover-image"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[#8A9A92]">
                    No photo
                  </div>
                )}
              </div>
              {report.photo_urls?.length > 1 && (
                <div className="p-3 flex gap-2 overflow-x-auto scroll-hide">
                  {report.photo_urls.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setActivePhoto(i)}
                      className={`shrink-0 h-16 w-20 rounded-md overflow-hidden border-2 transition-colors ${
                        activePhoto === i ? "border-[#E06A4F]" : "border-transparent"
                      }`}
                      data-testid={`detail-thumb-${i}`}
                    >
                      <img src={fileUrl(p)} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Map */}
            <div className="mt-6">
              <FindrMap
                reports={[report]}
                center={[report.latitude, report.longitude]}
                zoom={14}
                height={320}
              />
            </div>
          </div>

          <div className="lg:col-span-5">
            <span
              className="px-2.5 py-1 rounded-md text-xs uppercase tracking-[0.2em] font-semibold text-white inline-block"
              style={{ background: accent }}
              data-testid="detail-badge"
            >
              {report.report_type}
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-black mt-3" data-testid="detail-title">
              {report.name || report.entity_type}
            </h1>
            <div className="mt-1 text-sm uppercase tracking-[0.2em] text-[#8A9A92]">
              {report.entity_type}
              {report.color ? ` · ${report.color}` : ""}
            </div>
            <p className="mt-4 text-[#4A5F54] leading-relaxed">{report.description}</p>

            <div className="mt-6 space-y-2 text-sm text-[#4A5F54]">
              {report.location_text && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> {report.location_text}
                </div>
              )}
              {report.date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />{" "}
                  {new Date(report.date).toLocaleDateString()}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> {report.contact}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={`tel:${report.contact}`}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-md bg-[#1A2F24] text-white hover:bg-[#0d1f17]"
                data-testid="detail-call-button"
              >
                <Phone className="h-4 w-4" /> Contact reporter
              </a>
              {(user?.role === "ngo" || user?.role === "admin") && !isOwner && (
                <Button
                  onClick={onClaim}
                  className="bg-[#7D9774] hover:bg-[#6B8562] text-white rounded-md"
                  data-testid="detail-claim-button"
                >
                  <ShieldCheck className="h-4 w-4 mr-1" /> Claim case
                </Button>
              )}
              {isOwner && (
                <>
                  <Link
                    to={`/my-reports`}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-md border border-[#1A2F24] text-[#1A2F24] hover:bg-[#1A2F24] hover:text-white"
                    data-testid="detail-edit-link"
                  >
                    <ExternalLink className="h-4 w-4" /> Manage
                  </Link>
                  <Button
                    variant="destructive"
                    onClick={onDelete}
                    data-testid="detail-delete-button"
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </>
              )}
            </div>

            {/* Matches */}
            <div className="mt-10">
              <div className="flex items-center gap-2 text-[#1A2F24]">
                <Sparkles className="h-4 w-4 text-[#E06A4F]" />
                <h2 className="font-display text-xl font-bold">Possible matches</h2>
              </div>
              {matches.length === 0 ? (
                <p className="mt-3 text-sm text-[#8A9A92]" data-testid="detail-no-matches">
                  No close matches yet — check back as new reports come in.
                </p>
              ) : (
                <div className="mt-4 space-y-3" data-testid="detail-matches">
                  {matches.map((m) => (
                    <Link
                      key={m.report.id}
                      to={`/reports/${m.report.id}`}
                      className="block bento-card p-4 flex gap-3 items-center"
                      data-testid={`match-${m.report.id}`}
                    >
                      <div className="h-16 w-16 shrink-0 rounded-md overflow-hidden bg-[#F4F1EA]">
                        {m.report.photo_urls?.[0] && (
                          <img
                            src={fileUrl(m.report.photo_urls[0])}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display font-bold truncate">
                          {m.report.name || m.report.entity_type}
                        </div>
                        <div className="text-xs text-[#8A9A92] truncate">
                          {m.report.color || ""} · {m.distance_km} km away
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-2xl font-black text-[#E06A4F]">
                          {Math.round(m.score)}%
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-[#8A9A92]">
                          match
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
