import React, { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import FindrMap from "@/components/FindrMap";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Crosshair, Save } from "lucide-react";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    alert_radius_km: 5,
    alert_lat: null,
    alert_lng: null,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        phone: user.phone || "",
        alert_radius_km: user.alert_radius_km || 5,
        alert_lat: user.alert_lat || null,
        alert_lng: user.alert_lng || null,
      });
    }
  }, [user]);

  function set(k, v) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function detect() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => {
      set("alert_lat", p.coords.latitude);
      set("alert_lng", p.coords.longitude);
    });
  }

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await api.put("/auth/profile", form);
      await refreshUser();
      setMsg("Saved!");
      setTimeout(() => setMsg(""), 1800);
    } catch (e) {
      setMsg(e.response?.data?.detail || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const selected =
    form.alert_lat && form.alert_lng
      ? { lat: form.alert_lat, lng: form.alert_lng }
      : null;
  const center = selected ? [selected.lat, selected.lng] : [20.5937, 78.9629];

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        <p className="text-xs uppercase tracking-[0.3em] text-[#7D9774] font-semibold">
          Your profile
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-black mt-2 tracking-tight">
          Personal info & alert area
        </h1>
        <p className="text-[#4A5F54] mt-2 max-w-2xl">
          Set the area you watch. We'll ping you when a new report appears within
          your radius.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-10">
          <div className="lg:col-span-5 space-y-5">
            <div>
              <Label htmlFor="p-name">Name</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="mt-1"
                data-testid="profile-name-input"
              />
            </div>
            <div>
              <Label htmlFor="p-phone">Phone</Label>
              <Input
                id="p-phone"
                value={form.phone || ""}
                onChange={(e) => set("phone", e.target.value)}
                className="mt-1"
                data-testid="profile-phone-input"
              />
            </div>
            <div>
              <Label>Alert radius: {form.alert_radius_km} km</Label>
              <Slider
                min={1}
                max={50}
                step={1}
                value={[form.alert_radius_km]}
                onValueChange={(v) => set("alert_radius_km", v[0])}
                className="mt-3"
                data-testid="profile-radius-slider"
              />
              <p className="text-xs text-[#8A9A92] mt-2">
                You'll get notified for any new report within this distance from
                your alert location.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={detect}
                className="flex items-center gap-1 text-sm text-[#7D9774] hover:text-[#6B8562]"
                data-testid="profile-detect-button"
              >
                <Crosshair className="h-4 w-4" /> Use my location
              </button>
              {selected && (
                <p
                  className="text-xs text-[#8A9A92] mt-1"
                  data-testid="profile-coords"
                >
                  Pinned at {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={save}
                disabled={busy}
                className="bg-[#E06A4F] hover:bg-[#C95B42] text-white rounded-md"
                data-testid="profile-save-button"
              >
                <Save className="h-4 w-4 mr-1" />
                {busy ? "Saving…" : "Save changes"}
              </Button>
              {msg && (
                <span className="text-sm text-[#7D9774]" data-testid="profile-save-msg">
                  {msg}
                </span>
              )}
            </div>
          </div>

          <div className="lg:col-span-7">
            <Label>Click the map to pin your alert centre</Label>
            <div className="mt-2">
              <FindrMap
                center={center}
                zoom={selected ? 12 : 5}
                selected={selected}
                onPick={({ lat, lng }) => {
                  set("alert_lat", lat);
                  set("alert_lng", lng);
                }}
                height={460}
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
