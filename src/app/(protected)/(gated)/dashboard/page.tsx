import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: dog }, { data: walkingPin }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, bio")
        .eq("id", user!.id)
        .single(),
      supabase
        .from("dogs")
        .select("name, breed, photo_path")
        .eq("owner_id", user!.id)
        .single(),
      supabase
        .from("walking_pins")
        .select("lat, lng, radius_m, dogs!inner(owner_id)")
        .eq("dogs.owner_id", user!.id)
        .maybeSingle(),
    ]);

  // Signed URL for dog photo
  let signedUrl: string | null = null;
  if (dog?.photo_path) {
    const { data } = await supabase.storage
      .from("dog-photos")
      .createSignedUrl(dog.photo_path, 60);
    signedUrl = data?.signedUrl ?? null;
  }

  // Contextual tip for welcome banner
  const tip = walkingPin
    ? "Your walking area is set — matches are on the way!"
    : "Set your walking area to start finding nearby buddies.";

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {/* Welcome banner */}
      <Card>
        <CardContent className="py-5">
          <p className="text-lg font-medium">
            Welcome back, {profile?.display_name ?? "friend"} 👋
          </p>
          <p className="text-sm text-muted-foreground mt-1">{tip}</p>
        </CardContent>
      </Card>

      {/* Cards grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Dog card — taller with larger photo + owner info */}
        <Link href="/profile">
          <Card className="h-full hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle>{dog?.name ?? "Your Dog"}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {dog?.breed && (
                <p className="text-sm text-muted-foreground">{dog.breed}</p>
              )}
              {signedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signedUrl}
                  alt={`${dog?.name ?? "Dog"} photo`}
                  className="rounded-lg w-full max-w-[200px] aspect-square object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-lg bg-muted flex items-center justify-center text-4xl">
                  🐾
                </div>
              )}
              {profile?.display_name && (
                <p className="text-xs text-muted-foreground mt-2">
                  Owner: {profile.display_name}
                </p>
              )}
              {profile?.bio && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {profile.bio}
                </p>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Walking Area card with mini-map */}
        <Link href="/walking-area">
          <Card className="h-full hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle>Walking Area</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {walkingPin ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Area set ✓ — {walkingPin.radius_m}m radius
                  </p>
                  {/* Mini-map placeholder showing coordinates */}
                  <div className="rounded-lg w-full h-[120px] bg-muted flex flex-col items-center justify-center gap-1">
                    <span className="text-2xl">🗺️</span>
                    <span className="text-xs text-muted-foreground">
                      {walkingPin.lat.toFixed(3)}, {walkingPin.lng.toFixed(3)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-full h-[120px] rounded-lg bg-muted flex items-center justify-center text-3xl">
                    📍
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <span>Set your walking area</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Matches card */}
        <Card className="h-full opacity-75">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-4" />
              Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Coming soon — we&apos;ll suggest compatible walking buddies nearby.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
