import React from "react";
import { Link } from "react-router-dom";
import { fileUrl } from "@/lib/api";
import { Calendar, MapPin, Phone, Tag } from "lucide-react";

export default function ReportCard({ report, onAction }) {
  const isLost = report.report_type === "lost";
  const badgeColor = isLost ? "#E06A4F" : "#7D9774";
  const photo = (report.photo_urls && report.photo_urls[0]) || null;
  return (
    <div
      data-testid={`report-card-${report.id}`}
      className="bento-card overflow-hidden flex flex-col"
    >
      <div className="relative aspect-[4/3] bg-[#F4F1EA] overflow-hidden">
        {photo ? (
          <img
            src={fileUrl(photo)}
            alt={report.name || report.entity_type}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[#8A9A92] text-sm">
            No photo
          </div>
        )}
        <span
          className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-xs uppercase tracking-[0.2em] font-semibold text-white"
          style={{ background: badgeColor }}
          data-testid={`report-card-badge-${report.id}`}
        >
          {report.report_type}
        </span>
        {report.status === "resolved" && (
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-[#1A2F24] text-white text-xs uppercase tracking-[0.2em]">
            Resolved
          </span>
        )}
      </div>
      <div className="p-5 flex-1 flex flex-col gap-3">
        <div>
          <h3 className="font-display font-bold text-lg text-[#1A2F24] truncate">
            {report.name || report.entity_type}
          </h3>
          <div className="text-xs uppercase tracking-[0.2em] text-[#8A9A92] mt-1">
            {report.entity_type}
            {report.color ? ` · ${report.color}` : ""}
          </div>
        </div>
        <p className="text-sm text-[#4A5F54] leading-relaxed line-clamp-2">
          {report.description}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#8A9A92] mt-1">
          {report.location_text && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {report.location_text}
            </span>
          )}
          {report.distance_km !== undefined && (
            <span className="flex items-center gap-1">
              <Tag className="h-3 w-3" /> {report.distance_km} km away
            </span>
          )}
          {report.date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />{" "}
              {new Date(report.date).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="mt-auto pt-3 flex items-center justify-between border-t border-[#EAE5D9]">
          <a
            href={`tel:${report.contact}`}
            className="flex items-center gap-1.5 text-sm text-[#4A5F54] hover:text-[#1A2F24]"
            data-testid={`report-card-contact-${report.id}`}
          >
            <Phone className="h-3.5 w-3.5" /> {report.contact}
          </a>
          <Link
            to={`/reports/${report.id}`}
            className="text-sm font-semibold text-[#E06A4F] hover:text-[#C95B42]"
            data-testid={`report-card-view-${report.id}`}
          >
            View →
          </Link>
        </div>
        {onAction && onAction(report)}
      </div>
    </div>
  );
}
