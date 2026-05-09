import React from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";

// Custom drop pin
function makePin(color, label = "") {
  return L.divIcon({
    className: "",
    html: `<div class="findr-pin" style="background:${color}"><span class="findr-pin-inner">${label}</span></div>`,
    iconSize: [32, 42],
    iconAnchor: [16, 38],
    popupAnchor: [0, -36],
  });
}

export const lostIcon = makePin("#E06A4F", "L");
export const foundIcon = makePin("#7D9774", "F");
export const userIcon = makePin("#669BBC", "U");
export const selectedIcon = makePin("#1A2F24", "•");

function ClickPicker({ onPick }) {
  useMapEvents({
    click(e) {
      onPick && onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function Recenter({ center }) {
  const map = useMap();
  React.useEffect(() => {
    if (center) map.flyTo(center, map.getZoom(), { duration: 0.7 });
  }, [center, map]);
  return null;
}

export default function FindrMap({
  center = [20.5937, 78.9629],
  zoom = 5,
  reports = [],
  userLocation,
  selected,
  onPick,
  height = 480,
  onMarkerClick,
}) {
  return (
    <div
      data-testid="findr-map"
      className="rounded-xl overflow-hidden border border-[#EAE5D9]"
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {onPick && <ClickPicker onPick={onPick} />}
        {reports.map((r) => (
          <Marker
            key={r.id}
            position={[r.latitude, r.longitude]}
            icon={r.report_type === "lost" ? lostIcon : foundIcon}
            eventHandlers={{
              click: () => onMarkerClick && onMarkerClick(r),
            }}
          >
            <Popup>
              <div className="font-display font-bold text-[#1A2F24]">
                {r.name || r.entity_type}
              </div>
              <div className="text-xs uppercase tracking-widest text-[#8A9A92]">
                {r.report_type}
              </div>
              <p className="text-sm text-[#4A5F54] mt-1">
                {(r.description || "").slice(0, 120)}
              </p>
            </Popup>
          </Marker>
        ))}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}
        {selected && (
          <Marker position={[selected.lat, selected.lng]} icon={selectedIcon}>
            <Popup>Selected location</Popup>
          </Marker>
        )}
        <Recenter center={selected ? [selected.lat, selected.lng] : null} />
      </MapContainer>
    </div>
  );
}
