"use client";

import { useEffect, useState } from "react";
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

export default function Dashboard() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/competitions")
      .then((r) => r.json())
      .then(setCompetitions)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-muted-foreground">Loading competitions...</p>;
  }

  if (competitions.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-semibold mb-2">No competitions yet</h2>
        <p className="text-muted-foreground mb-6">
          Create your first giveaway competition to get started.
        </p>
        <Link
          href="/competitions/new"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + New Competition
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Competitions</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {competitions.map((comp) => {
          const isActive = new Date(comp.endDate) >= new Date();
          return (
            <Link key={comp.id} href={`/competitions/${comp.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{comp.name}</CardTitle>
                    <Badge variant={isActive ? "default" : "secondary"}>
                      {isActive ? "Active" : "Ended"}
                    </Badge>
                  </div>
                  <CardDescription>
                    Hashtag: <span className="font-mono">{comp.hashtag}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{comp._count.posts} posts</span>
                    <span>{comp._count.grades} grades</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
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
