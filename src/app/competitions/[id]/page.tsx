"use client";

import { useEffect, useState, use, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Criterion } from "@/lib/types";

interface Post {
  id: string;
  fbPostId: string;
  authorName: string;
  content: string;
  imageUrl: string | null;
  postUrl: string | null;
  remarks: string | null;
  likesCount: number;
  commentsCount: number;
  createdTime: string;
  grades: {
    id: string;
    totalScore: number;
    judge: { name: string };
  }[];
}

interface Competition {
  id: string;
  name: string;
  hashtag: string;
  startDate: string;
  endDate: string;
  postingWindowStart: string | null;
  postingWindowEnd: string | null;
  criteria: string;
  posts: Post[];
}

export default function CompetitionDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [fetchMessage, setFetchMessage] = useState("");
  const [scrollCount, setScrollCount] = useState(15);
  const [showFetchSettings, setShowFetchSettings] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";

  const loadCompetition = useCallback(() => {
    fetch(`/api/competitions/${id}`)
      .then((r) => r.json())
      .then(setCompetition)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadCompetition();
  }, [loadCompetition]);

  const handleFetchPosts = async () => {
    setFetching(true);
    setFetchMessage("");
    try {
      const res = await fetch(`/api/competitions/${id}/fetch-posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scrollCount,
          groupUrl: "https://www.facebook.com/groups/habuild",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFetchMessage(data.message);
        loadCompetition();
      } else {
        setFetchMessage(`Error: ${data.error}`);
      }
    } catch {
      setFetchMessage("Failed to get posts from Facebook.");
    } finally {
      setFetching(false);
    }
  };

  const handleUploadPosts = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFetchMessage("");
    try {
      const text = await file.text();
      const posts = JSON.parse(text);
      const res = await fetch(`/api/competitions/${id}/upload-posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(posts),
      });
      const data = await res.json();
      if (res.ok) {
        setFetchMessage(data.message);
        loadCompetition();
      } else {
        setFetchMessage(`Error: ${data.error}`);
      }
    } catch {
      setFetchMessage("Failed to parse or upload the JSON file.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Delete this post?")) return;
    await fetch(`/api/competitions/${id}/posts/${postId}`, { method: "DELETE" });
    loadCompetition();
  };

  const handleRemarks = async (postId: string, remarks: string) => {
    await fetch(`/api/competitions/${id}/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remarks }),
    });
  };

  if (loading) return <p className="text-muted-foreground font-bold">Loading competition...</p>;
  if (!competition) return <p className="text-destructive font-bold">Competition not found.</p>;

  const criteria: Criterion[] = JSON.parse(competition.criteria);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-slate-800">
            {competition.name}
          </h1>
          <p className="text-muted-foreground font-bold mt-1">
            {competition.hashtag && (
              <span className="font-mono text-indigo-700">{competition.hashtag} &middot; </span>
            )}
            {new Date(competition.startDate).toLocaleDateString()} &mdash;{" "}
            {new Date(competition.endDate).toLocaleDateString()}
            {competition.postingWindowStart && competition.postingWindowEnd && (
              <span className="ml-2 text-teal-700 font-bold">
                · Window: {competition.postingWindowStart} – {competition.postingWindowEnd} IST
              </span>
            )}
          </p>
          <div className="flex gap-2 mt-2 flex-wrap">
            {criteria.map((c) => (
              <Badge key={c.name} variant="outline" className="font-bold border-indigo-300 text-indigo-800 bg-indigo-50">
                {c.name} (max {c.maxScore})
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" className="font-bold" onClick={() => setShowFetchSettings(!showFetchSettings)}>
                Settings
              </Button>
              <Button onClick={handleFetchPosts} disabled={fetching} className="bg-gradient-to-r from-indigo-700 to-blue-700 text-white font-bold hover:opacity-90">
                {fetching ? "Getting Posts..." : "Get Posts"}
              </Button>
              <label className="cursor-pointer">
                <span className="inline-flex items-center justify-center rounded-md border border-green-400 bg-white px-3 py-1.5 text-sm font-bold text-green-700 hover:bg-green-50 transition-colors">
                  {uploading ? "Uploading..." : "Upload JSON"}
                </span>
                <input type="file" accept=".json" className="hidden" onChange={handleUploadPosts} />
              </label>
            </>
          )}
          <Link href={`/competitions/${id}/grade`}>
            <Button variant="outline" className="font-bold border-blue-300 text-blue-700 hover:bg-blue-50">Grade Posts</Button>
          </Link>
          <Link href={`/competitions/${id}/leaderboard`}>
            <Button variant="outline" className="font-bold border-teal-300 text-teal-700 hover:bg-teal-50">Leaderboard</Button>
          </Link>
        </div>
      </div>

      {isAdmin && showFetchSettings && (
        <Card className="mb-4 border-indigo-200 bg-indigo-50/50">
          <CardContent className="pt-4">
            <div className="flex gap-4 items-end">
              <div>
                <Label htmlFor="scrollCount" className="font-bold">Scroll Depth</Label>
                <Input id="scrollCount" type="number" min={1} max={100} value={scrollCount}
                  onChange={(e) => setScrollCount(parseInt(e.target.value) || 15)} className="w-24" />
                <p className="text-xs text-muted-foreground font-bold mt-1">More scrolls = more posts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {fetchMessage && (
        <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-indigo-100 to-blue-100 text-sm font-bold text-slate-800">
          {fetchMessage}
        </div>
      )}

      {/* Posts table */}
      <div className="mt-2">
        <h2 className="text-lg font-extrabold mb-3">
          Posts ({competition.posts.length})
        </h2>

        {competition.posts.length === 0 ? (
          <p className="text-muted-foreground font-bold">
            {isAdmin ? 'No posts yet. Click "Get Posts" or "Upload JSON" to load entries.' : "No posts fetched yet."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-slate-200">
                  <th className="text-left px-3 py-2 font-extrabold text-slate-700 w-8">#</th>
                  <th className="text-left px-3 py-2 font-extrabold text-slate-700 w-40">Author</th>
                  <th className="text-left px-3 py-2 font-extrabold text-slate-700">Post</th>
                  <th className="text-left px-3 py-2 font-extrabold text-slate-700 w-32">Likes</th>
                  <th className="text-left px-3 py-2 font-extrabold text-slate-700 w-48">Graded By</th>
                  <th className="text-left px-3 py-2 font-extrabold text-slate-700 w-48">Remarks</th>
                  {isAdmin && <th className="text-left px-3 py-2 font-extrabold text-slate-700 w-16"></th>}
                </tr>
              </thead>
              <tbody>
                {competition.posts.map((post, index) => (
                  <PostRow
                    key={post.id}
                    post={post}
                    index={index}
                    isAdmin={isAdmin}
                    onDelete={handleDelete}
                    onRemarks={handleRemarks}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PostRow({
  post,
  index,
  isAdmin,
  onDelete,
  onRemarks,
}: {
  post: Post;
  index: number;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onRemarks: (id: string, remarks: string) => void;
}) {
  const [remarks, setRemarks] = useState(post.remarks || "");

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 align-top">
      <td className="px-3 py-2 font-bold text-indigo-700">{index + 1}</td>
      <td className="px-3 py-2 font-bold text-slate-800">{post.authorName}</td>
      <td className="px-3 py-2 text-slate-700 max-w-xs">
        <p className="line-clamp-3 font-medium">{post.content}</p>
        {post.postUrl && (
          <a href={post.postUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs font-bold text-indigo-600 hover:underline mt-1 block">
            View on Facebook →
          </a>
        )}
      </td>
      <td className="px-3 py-2">
        <span className="text-xs font-bold text-blue-700">{post.likesCount} likes</span>
      </td>
      <td className="px-3 py-2">
        {post.grades.length === 0 ? (
          <span className="text-xs text-muted-foreground font-bold">Not graded</span>
        ) : (
          <div className="space-y-1">
            {post.grades.map((g) => (
              <div key={g.id} className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-700">{g.judge.name}</span>
                <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 font-bold px-1">
                  {g.totalScore}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </td>
      <td className="px-3 py-2">
        <textarea
          className="w-full text-xs border border-slate-200 rounded-lg p-1.5 resize-none font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300"
          rows={2}
          placeholder="Add remarks..."
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          onBlur={() => onRemarks(post.id, remarks)}
        />
      </td>
      {isAdmin && (
        <td className="px-3 py-2">
          <button onClick={() => onDelete(post.id)}
            className="text-red-500 hover:text-red-700 font-bold text-xs px-2 py-1 rounded hover:bg-red-50 transition-colors">
            Delete
          </button>
        </td>
      )}
    </tr>
  );
}
