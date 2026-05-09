import React, { useState, useRef } from "react";
import { Copy, MessageCircle, Twitter, Share2, Check } from "lucide-react";

function buildShareUrl(reportId) {
  return `${window.location.origin}/share/${reportId}`;
}

export default function ShareButtons({ report }) {
  const url = buildShareUrl(report.id);
  const text = `${
    report.report_type === "lost" ? "🚨 LOST" : "🟢 FOUND"
  }: ${report.name || report.entity_type}${
    report.location_text ? ` near ${report.location_text}` : ""
  }. Help spread the word — every share matters.`;
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  function copyLink() {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  const wa = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
  const tw = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  const native = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Findr report", text, url });
      } catch (_) {}
    } else copyLink();
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="share-buttons">
      <a
        href={wa}
        target="_blank"
        rel="noreferrer"
        data-testid="share-whatsapp"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold bg-[#25D366] text-white hover:opacity-90 transition-opacity"
      >
        <MessageCircle className="h-4 w-4" /> WhatsApp
      </a>
      <a
        href={tw}
        target="_blank"
        rel="noreferrer"
        data-testid="share-twitter"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold bg-[#1A2F24] text-white hover:bg-[#0d1f17] transition-colors"
      >
        <Twitter className="h-4 w-4" /> Twitter
      </a>
      <button
        onClick={copyLink}
        data-testid="share-copy"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold border border-[#1A2F24] text-[#1A2F24] hover:bg-[#1A2F24] hover:text-white transition-colors"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : "Copy link"}
      </button>
      <button
        onClick={native}
        data-testid="share-native"
        className="inline-flex sm:hidden items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold border border-[#1A2F24] text-[#1A2F24]"
      >
        <Share2 className="h-4 w-4" /> Share…
      </button>
      <input ref={inputRef} type="hidden" value={url} readOnly />
    </div>
  );
}
