import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import FindrMap from "@/components/FindrMap";
import ImageUploader from "@/components/ImageUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { Crosshair } from "lucide-react";

const ENTITY_TYPES = ["dog", "cat", "bird", "pet-other", "person", "object"];

export default function ReportFormPage() {
  const { type } = useParams(); // "lost" | "found"
  const navigate = useNavigate();
  const { user } = useAuth();
  const isLost = type === "lost";

  const [form, setForm] = useState({
    name: "",
    entity_type: "dog",
    description: "",
    color: "",
    contact: user?.phone || user?.email || "",
    location_text: "",
    date: new Date().toISOString().slice(0, 10),
    photo_urls: [],
  });
  const [pos, setPos] = useState(null);
  const [userLoc, setUserLoc] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function set(k, v) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function getMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const c = { lat: p.coords.latitude, lng: p.coords.longitude };
        setUserLoc(c);
        setPos(c);
      },
      () => setErr("Could not access your location"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  useEffect(() => {
    getMyLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const center = useMemo(() => (pos ? [pos.lat, pos.lng] : [20.5937, 78.9629]), [pos]);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!pos) {
      setErr("Please pick a location on the map.");
      return;
    }
    if (!form.description?.trim()) {
      setErr("Please add a short description.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        report_type: isLost ? "lost" : "found",
        latitude: pos.lat,
        longitude: pos.lng,
      };
      const { data } = await api.post("/reports", payload);
      navigate(`/reports/${data.id}`);
    } catch (e2) {
      setErr(e2.response?.data?.detail || "Failed to submit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <p className="text-xs uppercase tracking-[0.3em] text-[#7D9774] font-semibold">
          New report
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-black mt-2">
          Report {isLost ? <span className="text-[#E06A4F]">Lost</span> : <span className="text-[#7D9774]">Found</span>}
        </h1>
        <p className="text-[#4A5F54] mt-2 max-w-2xl">
          The more detail you share, the better the matches. Pin the exact spot on the map.
        </p>

        <form onSubmit={submit} className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Entity type</Label>
                <Select value={form.entity_type} onValueChange={(v) => set("entity_type", v)}>
                  <SelectTrigger className="mt-1" data-testid="form-entity-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map((t) => (
                      <SelectItem key={t} value={t} data-testid={`entity-option-${t}`}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="color">Color / distinguishing</Label>
                <Input
                  id="color"
                  value={form.color}
                  onChange={(e) => set("color", e.target.value)}
                  className="mt-1"
                  data-testid="form-color-input"
                  placeholder="brown, white patch"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="mt-1"
                data-testid="form-name-input"
                placeholder={isLost ? "Bruno" : "Unknown"}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className="mt-1"
                rows={4}
                required
                data-testid="form-description-input"
                placeholder="Approximate age, breed, behaviour, when last seen, distinguishing features…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="contact">Contact</Label>
                <Input
                  id="contact"
                  value={form.contact}
                  onChange={(e) => set("contact", e.target.value)}
                  className="mt-1"
                  required
                  data-testid="form-contact-input"
                  placeholder="phone or email"
                />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => set("date", e.target.value)}
                  className="mt-1"
                  data-testid="form-date-input"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="location_text">Area / landmark</Label>
              <Input
                id="location_text"
                value={form.location_text}
                onChange={(e) => set("location_text", e.target.value)}
                className="mt-1"
                data-testid="form-location-text"
                placeholder="Indiranagar 12th main, near Junction"
              />
            </div>
            <div>
              <Label>Photos</Label>
              <div className="mt-2">
                <ImageUploader
                  value={form.photo_urls}
                  onChange={(v) => set("photo_urls", v)}
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <Label>Location on map (click to pin)</Label>
              <button
                type="button"
                onClick={getMyLocation}
                data-testid="use-my-location-button"
                className="flex items-center gap-1 text-sm text-[#7D9774] hover:text-[#6B8562]"
              >
                <Crosshair className="h-4 w-4" /> Use my location
              </button>
            </div>
            <FindrMap
              center={center}
              zoom={pos ? 14 : 5}
              userLocation={userLoc}
              selected={pos ? { lat: pos.lat, lng: pos.lng } : null}
              onPick={(p) => setPos(p)}
              height={460}
            />
            {pos && (
              <p className="text-xs text-[#8A9A92]" data-testid="picked-coords">
                Pinned at {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
              </p>
            )}

            {err && (
              <p className="text-sm text-[#C95B42]" data-testid="form-error">
                {err}
              </p>
            )}
            <div className="pt-3 flex gap-3">
              <Button
                type="submit"
                disabled={busy}
                data-testid="form-submit-button"
                className={`text-white rounded-md px-7 ${
                  isLost
                    ? "bg-[#E06A4F] hover:bg-[#C95B42]"
                    : "bg-[#7D9774] hover:bg-[#6B8562]"
                }`}
              >
                {busy ? "Submitting…" : `Post ${isLost ? "lost" : "found"} report`}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                data-testid="form-cancel-button"
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
