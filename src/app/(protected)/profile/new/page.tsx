"use client";

import { useActionState, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createProfile, type ProfileState } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const initialState: ProfileState = { error: "" };

export default function NewProfilePage() {
  const [state, formAction, pending] = useActionState(createProfile, initialState);
  const [photoError, setPhotoError] = useState("");
  const [uploading, setUploading] = useState(false);
  const photoPathRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPhotoError("");
    if (photoPathRef.current) photoPathRef.current.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setPhotoError("Photo must be jpeg, png, or webp.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_SIZE) {
      setPhotoError("Photo must be 5 MB or smaller.");
      e.target.value = "";
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setPhotoError("Not authenticated."); return; }

    // Remove any existing object under the user's prefix before uploading
    // (handles the case where the extension changes).
    const { data: existing } = await supabase.storage
      .from("dog-photos")
      .list(user.id);
    if (existing && existing.length > 0) {
      await supabase.storage
        .from("dog-photos")
        .remove(existing.map((o) => `${user.id}/${o.name}`));
    }

    const path = `${user.id}/dog.${ext}`;
    setUploading(true);
    const { error } = await supabase.storage
      .from("dog-photos")
      .upload(path, file, { upsert: true });
    setUploading(false);

    if (error) { setPhotoError(error.message); return; }
    if (photoPathRef.current) photoPathRef.current.value = path;
  }

  const busy = pending || uploading;

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Create your profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-6">
          {/* Owner section */}
          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">About you</p>
            <div className="flex flex-col gap-1">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                name="displayName"
                required
                maxLength={50}
                defaultValue={state.values?.displayName}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="bio">Bio <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <textarea
                id="bio"
                name="bio"
                maxLength={300}
                rows={3}
                defaultValue={state.values?.bio}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
          </div>

          {/* Dog section */}
          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Your dog</p>
            <div className="flex flex-col gap-1">
              <Label htmlFor="dogName">Dog name</Label>
              <Input
                id="dogName"
                name="dogName"
                required
                maxLength={50}
                defaultValue={state.values?.dogName}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="breed">Breed</Label>
              <Input
                id="breed"
                name="breed"
                required
                maxLength={50}
                defaultValue={state.values?.breed}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="photo">Photo <span className="text-muted-foreground font-normal">(optional, max 5 MB)</span></Label>
              <Input
                id="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                disabled={busy}
              />
              {/* Hidden field carries the uploaded Storage path to the server action */}
              <input type="hidden" name="photoPath" ref={photoPathRef} />
              {photoError && <p className="text-sm text-destructive">{photoError}</p>}
              {uploading && <p className="text-sm text-muted-foreground">Uploading…</p>}
            </div>
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={busy}>
            {pending ? "Saving…" : "Create profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
