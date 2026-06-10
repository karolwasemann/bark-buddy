import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16">
      <main className="flex max-w-lg flex-col items-center gap-8 text-center">
        {/* Brand */}
        <span className="text-6xl">🐾</span>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          BarkBuddy
        </h1>
        <p className="text-lg text-muted-foreground">
          Find walking buddies for your dog in your neighbourhood.
        </p>

        {/* Benefits */}
        <ul className="space-y-2 text-left text-muted-foreground">
          <li>🐕 Match with compatible dogs nearby</li>
          <li>📍 Set your walking area and get local suggestions</li>
          <li>🤝 Socialise your pup while making new friends</li>
        </ul>

        {/* CTAs */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/register">Create account</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
