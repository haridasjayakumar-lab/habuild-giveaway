"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await loginAction(formData);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      }
      // If no error, the server action redirects to "/" automatically
    } catch {
      // NEXT_REDIRECT throws — this is expected on success
      // The page will redirect automatically
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center relative">
      {/* Soothing background circles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 w-64 h-64 bg-indigo-100/50 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-blue-100/50 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-teal-50/50 rounded-full blur-3xl" />
      </div>
      <Card className="relative w-full max-w-md shadow-lg border-t-4 border-t-indigo-500">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-heading font-black text-slate-800">Habuild Giveaway Grader</CardTitle>
          <CardDescription className="font-bold">
            Sign in with your <strong>@habuild.in</strong> email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-bold">
                {error}
              </div>
            )}
            <div>
              <Label htmlFor="email" className="font-bold">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@habuild.in"
                required
              />
            </div>
            <div>
              <Label htmlFor="password" className="font-bold">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                required
              />
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-indigo-700 to-blue-700 text-white font-bold hover:opacity-90" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4 font-bold">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="underline font-bold text-indigo-700">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
