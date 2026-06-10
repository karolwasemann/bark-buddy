import { createClient } from "@/lib/supabase/server";
import { WalkingAreaClient } from "./WalkingAreaClient";

export default async function WalkingAreaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialData: { lat: number; lng: number; radius_m: number } | null = null;
  let fetchError = false;

  if (user) {
    const { data, error } = await supabase
      .from("walking_pins")
      .select("lat, lng, radius_m, dogs!inner(owner_id)")
      .eq("dogs.owner_id", user.id)
      .maybeSingle();

    if (error) {
      fetchError = true;
    } else if (data) {
      initialData = { lat: data.lat, lng: data.lng, radius_m: data.radius_m };
    }
  }

  return (
    <WalkingAreaClient
      initialLat={initialData?.lat ?? 52.52}
      initialLng={initialData?.lng ?? 13.405}
      initialRadius={initialData?.radius_m ?? 1000}
      fetchError={fetchError}
      isFirstVisit={!initialData}
    />
  );
}
