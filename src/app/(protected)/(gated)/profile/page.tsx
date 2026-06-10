import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: dog }] = await Promise.all([
    supabase.from("profiles").select("display_name, bio").eq("id", user!.id).single(),
    supabase.from("dogs").select("name, breed, photo_path").eq("owner_id", user!.id).single(),
  ]);

  // Mint a short-lived signed URL server-side. Plain <img> is intentional:
  // next/image requires an allowed host config and would cache beyond the TTL,
  // defeating the privacy intent of the private bucket.
  let signedUrl: string | null = null;
  if (dog?.photo_path) {
    const { data } = await supabase.storage
      .from("dog-photos")
      .createSignedUrl(dog.photo_path, 60); // 60-second TTL
    signedUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{profile?.display_name}</CardTitle>
        </CardHeader>
        {profile?.bio && (
          <CardContent>
            <p className="text-sm text-muted-foreground">{profile.bio}</p>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{dog?.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{dog?.breed}</p>
          {signedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signedUrl}
              alt={`${dog?.name}'s photo`}
              className="rounded-lg w-full max-w-xs object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center text-3xl">
              🐾
            </div>
          )}
        </CardContent>
      </Card>

      <Button variant="outline" asChild>
        <Link href="/profile/edit">Edit profile</Link>
      </Button>
    </div>
  );
}
