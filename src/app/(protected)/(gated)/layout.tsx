import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// This layout wraps all routes that require a complete profile (dashboard, profile view).
// /profile/new lives outside this group so the gate never runs for it — no redirect loop.
export default async function GatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Parent (protected) layout already redirects unauthenticated users,
  // but we re-check defensively so this layout is self-contained.
  if (!user) redirect("/login");

  // A dogs row implies profiles also exists (FK constraint).
  // If absent, the user hasn't completed onboarding yet.
  const { data: dog } = await supabase
    .from("dogs")
    .select("owner_id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!dog) redirect("/profile/new");

  return <>{children}</>;
}
