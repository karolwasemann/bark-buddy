"use server";

import { createClient } from "@/lib/supabase/server";

export async function saveWalkingPin(
  lat: number,
  lng: number,
  radius_m: number
): Promise<{ error?: string }> {
  // Validate ranges
  if (lat < -90 || lat > 90) return { error: "Latitude must be between -90 and 90." };
  if (lng < -180 || lng > 180) return { error: "Longitude must be between -180 and 180." };
  if (radius_m < 200 || radius_m > 5000) return { error: "Radius must be between 200 and 5000." };

  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    // Get the user's dog
    const { data: dog, error: dogError } = await supabase
      .from("dogs")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (dogError || !dog) return { error: "Dog profile not found." };

    const { error } = await supabase
      .from("walking_pins")
      .upsert(
        { dog_id: dog.id, lat, lng, radius_m, updated_at: new Date().toISOString() },
        { onConflict: "dog_id" }
      );

    if (error) return { error: error.message };
    return {};
  } catch {
    return { error: "Unexpected error. Please try again." };
  }
}
