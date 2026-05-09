import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, fileUrl } from "@/lib/api";
import FindrMap from "@/components/FindrMap";
import ShareButtons from "@/components/ShareButtons";
import { Calendar, MapPin, PawPrint, Phone } from "lucide-react";

export default function PublicReportPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [err, setErr] = useState("");

  useEffect(() => {
    api
      .get(`/reports/${id}`)
      .then((r) => setReport(r.data))
      .catch(() => setErr("Report not found"));
  }, [id]);

  if (err) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#4A5F54]" data-testid="public-not-found">
        {err}
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#8A9A92]">
        Loading…
      </div>
    );
  }

  const isLost = report.report_type === "lost";
  const accent = isLost ? "#E06A4F" : "#7D9774";

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <header className="border-b border-[#EAE5D9] bg-[#FDFBF7]/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="public-brand">
            <div className="h-8 w-8 rounded-md bg-[#E06A4F] flex items-center justify-center">
              <PawPrint className="h-4 w-4 text-white" strokeWidth={2.4} />
            </div>
            <span className="font-display font-black text-lg">Findr</span>
          </Link>
          <Link
            to="/signup"
            className="text-sm font-semibold text-[#E06A4F] hover:text-[#C95B42]"
            data-testid="public-join-link"
          >
            Join Findr →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <span
          className="px-2.5 py-1 rounded-md text-xs uppercase tracking-[0.2em] font-semibold text-white inline-block"
          style={{ background: accent }}
          data-testid="public-badge"
        >
          {report.report_type}
        </span>
        <h1 className="font-display text-3xl sm:text-5xl font-black mt-4 tracking-tight">
          {report.name || report.entity_type}
        </h1>
        <div className="mt-1 text-sm uppercase tracking-[0.2em] text-[#8A9A92]">
          {report.entity_type}
          {report.color ? ` · ${report.color}` : ""}
          {report.location_text ? ` · ${report.location_text}` : ""}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
          <div className="lg:col-span-7">
            <div className="bento-card overflow-hidden">
              <div className="aspect-[16/10] bg-[#F4F1EA]">
                {report.photo_urls?.length ? (
                  <img
                    src={fileUrl(report.photo_urls[activePhoto])}
                    alt="cover"
                    className="w-full h-full object-cover"
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
                      className={`shrink-0 h-16 w-20 rounded-md overflow-hidden border-2 ${
                        activePhoto === i ? "border-[#E06A4F]" : "border-transparent"
                      }`}
                    >
                      <img src={fileUrl(p)} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-6">
              <FindrMap
                reports={[report]}
                center={[report.latitude, report.longitude]}
                zoom={14}
                height={300}
              />
            </div>
          </div>
          <div className="lg:col-span-5 space-y-5">
            <p className="text-[#4A5F54] leading-relaxed text-base md:text-lg">
              {report.description}
            </p>

            <div className="bento-card p-5 space-y-2 text-sm text-[#4A5F54]">
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
                <Phone className="h-4 w-4" />{" "}
                <a className="text-[#1A2F24] font-semibold" href={`tel:${report.contact}`}>
                  {report.contact}
                </a>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#8A9A92] mb-2">
                Help by sharing
              </p>
              <ShareButtons report={report} />
            </div>

            <div className="bento-card p-5 bg-[#1A2F24] text-[#FDFBF7]">
              <p className="font-display text-lg font-bold">
                Have you seen this {report.entity_type}?
              </p>
              <p className="text-sm text-[#FDFBF7]/80 mt-2">
                Call the reporter directly, or sign up on Findr to coordinate with
                local volunteers and NGOs.
              </p>
              <Link
                to="/signup"
                className="mt-4 inline-block px-4 py-2 rounded-md bg-[#E06A4F] hover:bg-[#C95B42] text-white text-sm font-semibold transition-colors"
                data-testid="public-cta-signup"
              >
                Join Findr — it's free
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-[#EAE5D9] py-8 text-center text-sm text-[#8A9A92]">
        © {new Date().getFullYear()} Findr · Built for community recovery
      </footer>
    </div>
  );
}
