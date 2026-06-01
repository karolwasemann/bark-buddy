import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResetPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">Coming soon.</p>
        <Link href="/login" className="text-sm underline">
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  );
}
