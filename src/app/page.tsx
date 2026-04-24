"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Competition {
  id: string;
  name: string;
  hashtag: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  _count: {
    posts: number;
    grades: number;
  };
}

const cardColors = [
  "from-slate-50 to-blue-50 hover:from-slate-100 hover:to-blue-100",
  "from-indigo-50 to-slate-50 hover:from-indigo-100 hover:to-slate-100",
  "from-blue-50 to-teal-50 hover:from-blue-100 hover:to-teal-100",
  "from-sky-50 to-indigo-50 hover:from-sky-100 hover:to-indigo-100",
  "from-teal-50 to-blue-50 hover:from-teal-100 hover:to-blue-100",
  "from-cyan-50 to-slate-50 hover:from-cyan-100 hover:to-slate-100",
];

export default function Dashboard() {
  const { data: session } = useSession();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";

  useEffect(() => {
    fetch("/api/competitions")
      .then((r) => r.json())
      .then(setCompetitions)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-muted-foreground font-bold">Loading competitions...</p>;
  }

  if (competitions.length === 0) {
    return (
      <div className="text-center py-20">
        {/* Soothing decorative element */}
        <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center">
          <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <h2 className="text-3xl font-heading font-black mb-2 text-slate-800">
          No competitions yet
        </h2>
        <p className="text-muted-foreground font-bold mb-6">
          {isAdmin
            ? "Create your first giveaway competition to get started."
            : "No active competitions right now. Check back soon!"}
        </p>
        {isAdmin && (
          <Link
            href="/competitions/new"
            className="inline-flex items-center rounded-lg bg-gradient-to-r from-indigo-700 to-blue-700 px-6 py-3 text-sm font-bold text-white hover:opacity-90 shadow-md transition-opacity"
          >
            + New Competition
          </Link>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-3xl font-heading font-black text-slate-800">
          Competitions
        </h1>
        {/* Small decorative wave */}
        <div className="flex-1 h-px bg-gradient-to-r from-indigo-200 via-blue-200 to-transparent" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {competitions.map((comp, i) => {
          const isActive = new Date(comp.endDate) >= new Date();
          return (
            <Link key={comp.id} href={`/competitions/${comp.id}`}>
              <Card className={`bg-gradient-to-br ${cardColors[i % cardColors.length]} transition-all cursor-pointer shadow-sm hover:shadow-lg`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-extrabold">{comp.name}</CardTitle>
                    <Badge
                      variant={isActive ? "default" : "secondary"}
                      className={isActive ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold" : "font-bold"}
                    >
                      {isActive ? "Active" : "Ended"}
                    </Badge>
                  </div>
                  <CardDescription className="font-bold">
                    Hashtag: <span className="font-mono text-indigo-700">{comp.hashtag}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm font-bold">
                    <span className="text-slate-700">{comp._count.posts} posts</span>
                    <span className="text-teal-700">{comp._count.grades} grades</span>
                  </div>
                  <p className="text-xs font-bold text-muted-foreground mt-2">
                    {new Date(comp.startDate).toLocaleDateString()} &mdash;{" "}
                    {new Date(comp.endDate).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
