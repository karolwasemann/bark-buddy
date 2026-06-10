"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ProfileState = {
  error: string;
  values?: {
    displayName: string;
    bio: string;
    dogName: string;
    breed: string;
  };
};

export async function createProfile(
  _prevState: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const displayName = formData.get("displayName")?.toString() ?? "";
  const bio = formData.get("bio")?.toString() ?? "";
  const dogName = formData.get("dogName")?.toString() ?? "";
  const breed = formData.get("breed")?.toString() ?? "";
  const photoPath = formData.get("photoPath")?.toString() ?? "";

  const values = { displayName, bio, dogName, breed };

  // Validate owner fields
  if (displayName.length < 1 || displayName.length > 50)
    return { error: "Display name must be 1–50 characters.", values };
  if (bio.length > 300)
    return { error: "Bio must be 300 characters or fewer.", values };

  // Validate dog fields
  if (dogName.length < 1 || dogName.length > 50)
    return { error: "Dog name must be 1–50 characters.", values };
  if (breed.length < 1 || breed.length > 50)
    return { error: "Breed must be 1–50 characters.", values };

  // If a photo path was supplied, verify it belongs to the calling user and has an allowed extension.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated.", values };

  if (photoPath) {
    const segments = photoPath.split("/");
    const ext = segments[segments.length - 1]?.split(".").pop()?.toLowerCase() ?? "";
    if (segments[0] !== user.id)
      return { error: "Invalid photo path.", values };
    if (!["jpeg", "jpg", "png", "webp"].includes(ext))
      return { error: "Photo must be jpeg, png, or webp.", values };
  }

  try {
    // Upsert profiles so a retry after a partial failure doesn't dup-key.
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        { id: user.id, display_name: displayName, bio: bio || null },
        { onConflict: "id" }
      );
    if (profileError) return { error: profileError.message, values };

    // Insert the dog row.
    const { error: dogError } = await supabase.from("dogs").insert({
      owner_id: user.id,
      name: dogName,
      breed,
      photo_path: photoPath || null,
    });

    if (dogError) {
      // Clean up the orphaned photo if one was uploaded before this failure.
      if (photoPath) {
        await supabase.storage.from("dog-photos").remove([photoPath]);
      }
      return { error: dogError.message, values };
    }
  } catch {
    return { error: "Unexpected error. Please try again.", values };
  }

  // redirect() throws internally — must be called outside try/catch.
  redirect("/profile");
}
