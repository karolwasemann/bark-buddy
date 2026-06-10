"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { saveWalkingPin } from "./actions";

const MapView = dynamic(
  () => import("@/components/MapView").then((mod) => mod.MapView),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted animate-pulse" /> }
);

type Status = "idle" | "saving" | "saved" | "error";

interface Props {
  initialLat: number;
  initialLng: number;
  initialRadius: number;
}

export function WalkingAreaClient({ initialLat, initialLng, initialRadius }: Props) {
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [radius, setRadius] = useState(initialRadius);
  const [status, setStatus] = useState<Status>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSave = useCallback((newLat: number, newLng: number, newRadius: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setStatus("saving");
      try {
        const result = await saveWalkingPin(newLat, newLng, newRadius);
        setStatus(result.error ? "error" : "saved");
      } catch {
        setStatus("error");
      }
    }, 1500);
  }, []);

  function handleMapChange(newLat: number, newLng: number, newRadius: number) {
    setLat(newLat);
    setLng(newLng);
    debouncedSave(newLat, newLng, newRadius);
  }

  function handleRadiusChange(newRadius: number) {
    setRadius(newRadius);
    debouncedSave(lat, lng, newRadius);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="h-[60vh] w-full rounded-lg overflow-hidden border">
        <MapView initialLat={lat} initialLng={lng} initialRadius={radius} onChange={handleMapChange} />
      </div>

      <div className="flex items-center gap-4">
        <label htmlFor="radius" className="text-sm font-medium whitespace-nowrap">
          Radius: {radius}m
        </label>
        <input
          id="radius"
          type="range"
          min={200}
          max={5000}
          step={100}
          value={radius}
          onChange={(e) => handleRadiusChange(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <p className="text-xs text-muted-foreground h-4">
        {status === "saving" && "Saving…"}
        {status === "saved" && "Saved"}
        {status === "error" && "Failed — will retry"}
      </p>
    </div>
  );
}
