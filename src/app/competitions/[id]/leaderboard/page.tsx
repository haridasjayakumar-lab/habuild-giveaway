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
    return <p className="text-muted-foreground font-bold">Loading leaderboard...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold font-heading text-slate-800">
          Top 10 Leaderboard
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} className="font-bold border-teal-300 text-teal-700 hover:bg-teal-50">
            Export CSV
          </Button>
          <Link href={`/competitions/${id}`}>
            <Button variant="outline" className="font-bold">Back to Posts</Button>
          </Link>
          <Link href={`/competitions/${id}/grade`}>
            <Button variant="outline" className="font-bold border-blue-300 text-blue-700 hover:bg-blue-50">
              Grade Posts
            </Button>
          </Link>
        </div>
      </div>

      {leaderboard.length === 0 ? (
        <p className="text-muted-foreground font-bold">
          No graded posts yet. Grade some posts first.
        </p>
      ) : (
        <>
          <Card className="mb-6 overflow-hidden shadow-lg">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-slate-100 to-indigo-100">
                    <TableHead className="w-16 font-extrabold text-slate-800">Rank</TableHead>
                    <TableHead className="font-extrabold text-slate-800">Author</TableHead>
                    <TableHead className="text-center font-extrabold text-slate-700">Likes</TableHead>
                    {criteria.map((c) => (
                      <TableHead key={c.name} className="text-center font-extrabold text-slate-800">
                        {c.name}
                      </TableHead>
                    ))}
                    <TableHead className="text-center font-extrabold text-indigo-800">
                      Total Score
                    </TableHead>
                    <TableHead className="text-center font-extrabold text-teal-700">
                      Judges
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((entry, i) => (
                    <TableRow
                      key={entry.postId}
                      className={
                        i === 0
                          ? "bg-yellow-50/80 font-bold"
                          : i === 1
                          ? "bg-gray-50/80 font-bold"
                          : i === 2
                          ? "bg-orange-50/80 font-bold"
                          : "font-medium"
                      }
                    >
                      <TableCell>
                        {i === 0 ? (
                          <span className="text-lg font-extrabold text-yellow-600">1st</span>
                        ) : i === 1 ? (
                          <span className="text-lg font-extrabold text-gray-500">2nd</span>
                        ) : i === 2 ? (
                          <span className="text-lg font-extrabold text-orange-700">3rd</span>
                        ) : (
                          <span className="font-bold">#{i + 1}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-bold">{entry.authorName}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold text-slate-700">{entry.likesCount}</span>
                      </TableCell>
                      {criteria.map((c) => (
                        <TableCell key={c.name} className="text-center font-bold">
                          {entry.avgScores[c.name] || 0}
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        <Badge className="bg-gradient-to-r from-indigo-700 to-blue-600 text-white font-bold">
                          {entry.totalAvgScore}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-bold text-teal-700">
                        {entry.gradeCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Expanded cards for top 3 */}
          <h2 className="text-xl font-extrabold mb-4 font-heading text-slate-800">
            Top 3 Details
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {leaderboard.slice(0, 3).map((entry, i) => (
              <Card
                key={entry.postId}
                className={`shadow-lg ${
                  i === 0
                    ? "border-2 border-yellow-400 bg-gradient-to-b from-yellow-50 to-white"
                    : i === 1
                    ? "border-2 border-slate-400 bg-gradient-to-b from-slate-50 to-white"
                    : "border-2 border-indigo-400 bg-gradient-to-b from-indigo-50 to-white"
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-extrabold">
                      <span className={
                        i === 0 ? "text-yellow-600" : i === 1 ? "text-slate-500" : "text-indigo-600"
                      }>
                        {i === 0 ? "1st" : i === 1 ? "2nd" : "3rd"}
                      </span>{" "}
                      &mdash; {entry.authorName}
                    </CardTitle>
                    <Badge className="bg-gradient-to-r from-indigo-700 to-blue-600 text-white font-bold">
                      {entry.totalAvgScore} pts
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap mb-3 font-medium">
                    {entry.content}
                  </p>
                  {entry.imageUrl && (
                    <img
                      src={entry.imageUrl}
                      alt="Post image"
                      className="rounded-lg max-h-48 object-cover w-full mb-3 shadow-sm"
                    />
                  )}
                  <div className="text-xs font-bold text-muted-foreground">
                    <span className="text-slate-700">{entry.likesCount} likes</span> &middot; Graded by:{" "}
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
