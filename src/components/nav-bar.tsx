"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function NavBar() {
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <Link href="/login">
        <Button variant="outline" size="sm" className="bg-white/20 border-white/40 text-white hover:bg-white/30 font-bold">
          Sign In
        </Button>
      </Link>
    );
  }

  const isAdmin = (session.user as { role?: string }).role === "admin";

  return (
    <div className="flex items-center gap-3">
      {isAdmin && (
        <>
          <Link
            href="/competitions/new"
            className="inline-flex items-center rounded-lg bg-white text-slate-800 px-4 py-2 text-sm font-bold hover:bg-white/90 shadow-sm transition-colors"
          >
            + New Competition
          </Link>
        </>
      )}
      <span className="text-sm font-bold text-white/90 bg-white/10 px-3 py-1 rounded-full">
        {isAdmin ? "Admin" : "Judge"}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="text-white/80 hover:text-white hover:bg-white/20 font-bold"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        Sign Out
      </Button>
    </div>
  );
}
