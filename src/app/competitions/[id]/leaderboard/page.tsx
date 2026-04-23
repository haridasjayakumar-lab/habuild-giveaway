"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Criterion } from "@/lib/types";

interface LeaderboardEntry {
  postId: string;
  fbPostId: string;
  authorName: string;
  content: string;
  imageUrl: string | null;
  likesCount: number;
  commentsCount: number;
  avgScores: Record<string, number>;
  totalAvgScore: number;
  gradeCount: number;
  judges: string[];
}

export default function LeaderboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/competitions/${id}/leaderboard`)
      .then((r) => r.json())
      .then((data) => {
        setLeaderboard(data.leaderboard);
        setCriteria(data.criteria);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const exportCSV = () => {
    const headers = [
      "Rank",
      "Author",
      "Likes",
      ...criteria.map((c) => `Avg ${c.name}`),
      "Total Avg Score",
      "Judges",
      "Post Preview",
    ];
    const rows = leaderboard.map((entry, i) => [
      i + 1,
      entry.authorName,
      entry.likesCount,
      ...criteria.map((c) => entry.avgScores[c.name] || 0),
      entry.totalAvgScore,
      entry.judges.join("; "),
      `"${entry.content.replace(/"/g, '""')}"`,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
      "\n"
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leaderboard.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading leaderboard...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Top 10 Leaderboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Link href={`/competitions/${id}`}>
            <Button variant="outline">Back to Posts</Button>
          </Link>
          <Link href={`/competitions/${id}/grade`}>
            <Button variant="outline">Grade Posts</Button>
          </Link>
        </div>
      </div>

      {leaderboard.length === 0 ? (
        <p className="text-muted-foreground">
          No graded posts yet. Grade some posts first.
        </p>
      ) : (
        <>
          <Card className="mb-6">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead className="text-center">Likes</TableHead>
                    {criteria.map((c) => (
                      <TableHead key={c.name} className="text-center">
                        {c.name}
                      </TableHead>
                    ))}
                    <TableHead className="text-center">
                      Total Score
                    </TableHead>
                    <TableHead className="text-center">
                      Judges
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((entry, i) => (
                    <TableRow
                      key={entry.postId}
                      className={i < 3 ? "font-semibold" : ""}
                    >
                      <TableCell>
                        {i === 0 ? (
                          <span className="text-lg">1st</span>
                        ) : i === 1 ? (
                          <span className="text-lg">2nd</span>
                        ) : i === 2 ? (
                          <span className="text-lg">3rd</span>
                        ) : (
                          `#${i + 1}`
                        )}
                      </TableCell>
                      <TableCell>{entry.authorName}</TableCell>
                      <TableCell className="text-center">
                        {entry.likesCount}
                      </TableCell>
                      {criteria.map((c) => (
                        <TableCell key={c.name} className="text-center">
                          {entry.avgScores[c.name] || 0}
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        <Badge variant="default">
                          {entry.totalAvgScore}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {entry.gradeCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Expanded cards for top 3 */}
          <h2 className="text-lg font-semibold mb-4">Top 3 Details</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {leaderboard.slice(0, 3).map((entry, i) => (
              <Card
                key={entry.postId}
                className={
                  i === 0
                    ? "border-2 border-yellow-400"
                    : i === 1
                    ? "border-2 border-gray-400"
                    : "border-2 border-amber-700"
                }
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {i === 0 ? "1st" : i === 1 ? "2nd" : "3rd"} &mdash;{" "}
                      {entry.authorName}
                    </CardTitle>
                    <Badge>{entry.totalAvgScore} pts</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap mb-3">
                    {entry.content}
                  </p>
                  {entry.imageUrl && (
                    <img
                      src={entry.imageUrl}
                      alt="Post image"
                      className="rounded-md max-h-48 object-cover w-full mb-3"
                    />
                  )}
                  <div className="text-xs text-muted-foreground">
                    {entry.likesCount} likes &middot; Graded by:{" "}
                    {entry.judges.join(", ")}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
