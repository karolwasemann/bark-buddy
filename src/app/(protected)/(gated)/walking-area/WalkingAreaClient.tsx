"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { saveWalkingPin } from "./actions";

const MapView = dynamic(
  () => import("@/components/MapView").then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-muted animate-pulse" />,
  },
);

type Status = "idle" | "saving" | "saved" | "error";

interface Props {
  initialLat: number;
  initialLng: number;
  initialRadius: number;
  fetchError?: boolean;
  isFirstVisit?: boolean;
}

export function WalkingAreaClient({
  initialLat,
  initialLng,
  initialRadius,
  fetchError,
  isFirstVisit = false,
}: Props) {
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [radius, setRadius] = useState(initialRadius);
  const [status, setStatus] = useState<Status>("idle");
  const [hasMoved, setHasMoved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSave = useCallback(
    (newLat: number, newLng: number, newRadius: number) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        setStatus("saving");
        try {
          const result = await saveWalkingPin(newLat, newLng, newRadius);
          if (result.error) {
            setStatus("error");
            toast.error("Failed to save walking area");
          } else {
            setStatus("saved");
            toast.success("Walking area saved");
          }
        } catch {
          setStatus("error");
          toast.error("Failed to save walking area");
        }
      }, 1500);
    },
    [],
  );

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-[60vh] rounded-lg border bg-muted/50">
        <p className="text-sm text-destructive">
          Failed to load walking area data.
        </p>
        <a href="" className="text-sm underline text-primary">
          Retry
        </a>
      </div>
    );
  }

  function handleMapChange(newLat: number, newLng: number, newRadius: number) {
    setLat(newLat);
    setLng(newLng);
    if (!hasMoved) setHasMoved(true);
    debouncedSave(newLat, newLng, newRadius);
  }

  function handleRadiusChange(newRadius: number) {
    setRadius(newRadius);
    debouncedSave(lat, lng, newRadius);
  }

  const showGuide = isFirstVisit && !hasMoved;

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-4">
      {showGuide && (
        <p className="text-sm text-muted-foreground bg-muted rounded-lg px-4 py-3">
          📍 Drop your pin where you walk your dog — this helps us find nearby dog walkers for you.
        </p>
      )}

      <div className="h-[60vh] w-full rounded-lg overflow-hidden border">
        <MapView
          initialLat={lat}
          initialLng={lng}
          initialRadius={radius}
          onChange={handleMapChange}
        />
      </div>

      <div className="flex items-center gap-4">
        <label
          htmlFor="radius"
          className="text-sm font-medium whitespace-nowrap"
        >
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
      </p>
    </div>
  );
}
