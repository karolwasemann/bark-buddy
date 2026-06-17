import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: dog }, { data: walkingPin }, { data: matchesData }] =
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
      supabase.rpc("find_matches", { requesting_user_id: user!.id }),
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

  // Match count breakdown
  const matches = (matchesData as { distance_bucket: string }[] | null) ?? [];
  const matchCount = matches.length;
  const nearby = matches.filter((m) => m.distance_bucket === "nearby").length;
  const moderate = matches.filter((m) => m.distance_bucket === "moderate").length;
  const far = matches.filter((m) => m.distance_bucket === "far").length;

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
        <Link href="/matches">
          <Card className="h-full hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle>Matches</CardTitle>
            </CardHeader>
            <CardContent>
              {!walkingPin ? (
                <p className="text-sm text-muted-foreground">
                  Set walking area to find matches
                </p>
              ) : matchCount === 0 ? (
                <p className="text-sm text-muted-foreground">No matches yet</p>
              ) : (
                <div className="flex flex-col gap-1">
                  <p className="text-2xl font-bold">{matchCount}</p>
                  <p className="text-xs text-muted-foreground">
                    {nearby > 0 && `${nearby} nearby`}
                    {nearby > 0 && moderate > 0 && ", "}
                    {moderate > 0 && `${moderate} moderate`}
                    {(nearby > 0 || moderate > 0) && far > 0 && ", "}
                    {far > 0 && `${far} far`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
