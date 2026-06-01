"use client";

import { useActionState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { login } from "../actions";

const initialState = { error: "", email: "" };

function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const searchParams = useSearchParams();
  const message = searchParams.get("message");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
      </CardHeader>
      <CardContent>
        {message === "account-created" && (
          <p className="mb-4 text-sm text-green-600">
            Account created! Please sign in.
          </p>
        )}
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required defaultValue={state.email} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <div className="mt-4 flex flex-col gap-1 text-sm text-center">
          <Link href="/register" className="underline">Create an account</Link>
          <Link href="/reset-password" className="underline">Forgot password?</Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
