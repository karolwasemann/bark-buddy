"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons for Next.js bundling
L.Icon.Default.mergeOptions({
  iconUrl: "/leaflet/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

interface MapViewProps {
  initialLat: number;
  initialLng: number;
  initialRadius: number;
  onChange: (lat: number, lng: number, radius_m: number) => void;
}

export function MapView({ initialLat, initialLng, initialRadius, onChange }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  // Keep a ref to the latest onChange + radius to avoid re-creating the map
  const onChangeRef = useRef(onChange);
  const radiusRef = useRef(initialRadius);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { radiusRef.current = initialRadius; }, [initialRadius]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView([initialLat, initialLng], 13);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);
    markerRef.current = marker;

    const circle = L.circle([initialLat, initialLng], { radius: initialRadius, color: "#3b82f6", fillOpacity: 0.15 }).addTo(map);
    circleRef.current = circle;

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      circle.setLatLng(pos);
      onChangeRef.current(pos.lat, pos.lng, radiusRef.current);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update circle radius when prop changes
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(initialRadius);
    }
  }, [initialRadius]);

  return <div ref={containerRef} className="h-full w-full" />;
}
