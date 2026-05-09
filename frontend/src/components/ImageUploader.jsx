import React, { useRef, useState } from "react";
import { api, fileUrl } from "@/lib/api";
import { ImagePlus, X, Loader2 } from "lucide-react";

export default function ImageUploader({ value = [], onChange, max = 6 }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setErr("");
    setBusy(true);
    const next = [...value];
    try {
      for (const f of files) {
        if (next.length >= max) break;
        const fd = new FormData();
        fd.append("file", f);
        const { data } = await api.post("/uploads", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        next.push(data.path);
      }
      onChange && onChange(next);
    } catch (e2) {
      setErr(e2.response?.data?.detail || "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function remove(i) {
    const next = value.filter((_, idx) => idx !== i);
    onChange && onChange(next);
  }

  return (
    <div data-testid="image-uploader">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {value.map((p, i) => (
          <div
            key={i}
            className="relative aspect-square rounded-lg overflow-hidden border border-[#EAE5D9] bg-[#F4F1EA]"
            data-testid={`uploaded-image-${i}`}
          >
            <img src={fileUrl(p)} alt={`upload-${i}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-1 right-1 bg-[#1A2F24]/80 text-white rounded-full p-1 hover:bg-[#1A2F24]"
              data-testid={`remove-image-${i}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="aspect-square rounded-lg border-2 border-dashed border-[#EAE5D9] flex flex-col items-center justify-center gap-1 text-[#8A9A92] hover:border-[#7D9774] hover:text-[#7D9774] transition-colors"
            data-testid="upload-image-button"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <ImagePlus className="h-5 w-5" />
                <span className="text-xs">Add photo</span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
        data-testid="image-file-input"
      />
      {err && <p className="text-xs text-[#E06A4F] mt-2">{err}</p>}
    </div>
  );
}
