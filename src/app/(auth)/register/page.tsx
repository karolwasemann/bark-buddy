"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { register } from "../actions";

const initialState = { error: "", email: "" };

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(register, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create account</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required defaultValue={state.email} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required minLength={6} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input id="confirm" name="confirm" type="password" required minLength={6} />
          </div>
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create account"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-center">
          Already have an account?{" "}
          <Link href="/login" className="underline">Sign in</Link>
        </p>
      </CardContent>
    </Card>
  );
}
