import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type DistanceBucket = "nearby" | "moderate" | "far";

interface MatchCardProps {
  displayName: string;
  bio: string | null;
  dogName: string;
  dogBreed: string;
  photoUrl: string | null;
  distanceBucket: DistanceBucket;
}

const badgeStyles: Record<DistanceBucket, string> = {
  nearby: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  moderate:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  far: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const badgeLabels: Record<DistanceBucket, string> = {
  nearby: "Nearby",
  moderate: "Moderate",
  far: "Far",
};

export function MatchCard({
  displayName,
  bio,
  dogName,
  dogBreed,
  photoUrl,
  distanceBucket,
}: MatchCardProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{dogName}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeStyles[distanceBucket]}`}
          >
            {badgeLabels[distanceBucket]}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 flex-1">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={`${dogName} photo`}
            className="rounded-lg w-full aspect-square object-cover"
          />
        ) : (
          <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center text-4xl">
            🐾
          </div>
        )}
        <p className="text-sm text-muted-foreground">{dogBreed}</p>
        <p className="text-sm font-medium">{displayName}</p>
        {bio && (
          <p className="text-xs text-muted-foreground line-clamp-2">{bio}</p>
        )}
        <div className="mt-auto pt-3">
          <Button
            disabled
            aria-disabled="true"
            title="Walk invitations coming soon"
            className="w-full"
          >
            Invite to walk
          </Button>
          <span className="text-xs text-muted-foreground block text-center mt-1">
            Coming soon
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
