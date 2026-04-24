"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function NavBar() {
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <div className="flex gap-2">
        <Link href="/login">
          <Button variant="outline" size="sm" className="bg-white/20 border-white/40 text-white hover:bg-white/30 font-bold">
            Sign In
          </Button>
        </Link>
        <Link href="/register">
          <Button size="sm" className="bg-white text-slate-800 hover:bg-white/90 font-bold">
            Register
          </Button>
        </Link>
      </div>
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
          <Link
            href="/admin/users"
            className="inline-flex items-center rounded-lg bg-white/20 border border-white/40 text-white px-3 py-2 text-sm font-bold hover:bg-white/30 transition-colors"
          >
            Manage Team
          </Link>
        </>
      )}
      <span className="text-sm font-bold text-white/90">
        {session.user.name || session.user.email}
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
