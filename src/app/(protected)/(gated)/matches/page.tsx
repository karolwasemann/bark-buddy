import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MatchCard } from "@/components/MatchCard";

interface Match {
  profile_id: string;
  display_name: string;
  bio: string | null;
  dog_name: string;
  dog_breed: string;
  dog_photo_path: string | null;
  distance_bucket: "nearby" | "moderate" | "far";
}

export default async function MatchesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if user has a walking pin
  const { data: walkingPin } = await supabase
    .from("walking_pins")
    .select("lat, lng, dogs!inner(owner_id)")
    .eq("dogs.owner_id", user!.id)
    .maybeSingle();

  // Empty state A: no walking pin
  if (!walkingPin) {
    return (
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
            <span className="text-4xl">📍</span>
            <p className="text-lg font-medium">Set your walking area first</p>
            <p className="text-sm text-muted-foreground">
              We need your walking area to find nearby buddies for your dog.
            </p>
            <Button asChild>
              <Link href="/walking-area">Set walking area</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch matches via RPC
  const { data, error } = await supabase.rpc("find_matches", {
    requesting_user_id: user!.id,
  });
  const matches = data as Match[] | null;

  // Error state
  if (error) {
    return (
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Something went wrong loading matches. Please try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state B: pin exists but no matches
  if (!matches || matches.length === 0) {
    return (
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
            <span className="text-4xl">🐕</span>
            <p className="text-lg font-medium">No matches yet</p>
            <p className="text-sm text-muted-foreground">
              No walking buddies found in your area yet. Check back soon!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Generate signed URLs for dog photos in parallel
  const matchesWithPhotos = await Promise.all(
    matches.map(async (match) => {
      let signedPhotoUrl: string | null = null;
      if (match.dog_photo_path) {
        const { data } = await supabase.storage
          .from("dog-photos")
          .createSignedUrl(match.dog_photo_path, 60);
        signedPhotoUrl = data?.signedUrl ?? null;
      }
      return { ...match, signedPhotoUrl };
    })
  );

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Matches</h1>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {matchesWithPhotos.map((match) => (
          <MatchCard
            key={match.profile_id}
            displayName={match.display_name}
            bio={match.bio}
            dogName={match.dog_name}
            dogBreed={match.dog_breed}
            photoUrl={match.signedPhotoUrl}
            distanceBucket={match.distance_bucket}
          />
        ))}
      </div>
    </div>
  );
}
