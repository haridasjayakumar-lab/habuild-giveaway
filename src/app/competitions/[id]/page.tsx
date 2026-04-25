"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Criterion } from "@/lib/types";

interface Post {
  id: string;
  fbPostId: string;
  authorName: string;
  content: string;
  imageUrl: string | null;
  postUrl: string | null;
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

  const loadCompetition = () => {
    fetch(`/api/competitions/${id}`)
      .then((r) => r.json())
      .then(setCompetition)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCompetition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  if (loading) {
    return <p className="text-muted-foreground font-bold">Loading competition...</p>;
  }

  if (!competition) {
    return <p className="text-destructive font-bold">Competition not found.</p>;
  }

  const criteria: Criterion[] = JSON.parse(competition.criteria);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-slate-800">
            {competition.name}
          </h1>
          <p className="text-muted-foreground font-bold mt-1">
            <span className="font-mono text-indigo-700">{competition.hashtag}</span> &middot;{" "}
            {new Date(competition.startDate).toLocaleDateString()} &mdash;{" "}
            {new Date(competition.endDate).toLocaleDateString()}
          </p>
          <div className="flex gap-2 mt-3">
            {criteria.map((c) => (
              <Badge key={c.name} variant="outline" className="font-bold border-indigo-300 text-indigo-800 bg-indigo-50">
                {c.name} (max {c.maxScore})
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="font-bold"
                onClick={() => setShowFetchSettings(!showFetchSettings)}
              >
                Fetch Settings
              </Button>
              <Button
                onClick={handleFetchPosts}
                disabled={fetching}
                className="bg-gradient-to-r from-indigo-700 to-blue-700 text-white font-bold hover:opacity-90"
              >
                {fetching ? "Getting Posts..." : "Get Posts from Facebook"}
              </Button>
              <label className="cursor-pointer">
                <span className="inline-flex items-center justify-center rounded-md border border-green-400 bg-white px-3 py-1.5 text-sm font-bold text-green-700 hover:bg-green-50 transition-colors">
                  {uploading ? "Uploading..." : "Upload Posts JSON"}
                </span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleUploadPosts}
                />
              </label>
            </>
          )}
          <Link href={`/competitions/${id}/grade`}>
            <Button variant="outline" className="font-bold border-blue-300 text-blue-700 hover:bg-blue-50">
              Grade Posts
            </Button>
          </Link>
          <Link href={`/competitions/${id}/leaderboard`}>
            <Button variant="outline" className="font-bold border-teal-300 text-teal-700 hover:bg-teal-50">
              Leaderboard
            </Button>
          </Link>
        </div>
      </div>

      {isAdmin && showFetchSettings && (
        <Card className="mb-4 border-indigo-200 bg-indigo-50/50">
          <CardContent className="pt-4">
            <div className="flex gap-4 items-end">
              <div>
                <Label htmlFor="scrollCount" className="font-bold">Scroll Depth</Label>
                <Input
                  id="scrollCount"
                  type="number"
                  min={1}
                  max={100}
                  value={scrollCount}
                  onChange={(e) => setScrollCount(parseInt(e.target.value) || 15)}
                  className="w-24"
                />
                <p className="text-xs text-muted-foreground font-bold mt-1">
                  More scrolls = more posts loaded (each scroll ~ 2-3 sec)
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-bold mt-3">
              Uses Playwright to fetch posts from the Facebook group. For
              private groups, export your Facebook cookies to{" "}
              <code className="bg-indigo-100 px-1 rounded">fb-cookies.json</code> in the project root.
            </p>
          </CardContent>
        </Card>
      )}

      {fetchMessage && (
        <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-indigo-100 to-blue-100 text-sm font-bold text-slate-800">
          {fetchMessage}
        </div>
      )}

      <Separator className="mb-6" />

      <h2 className="text-xl font-extrabold mb-4">
        Posts ({competition.posts.length}) &mdash; <span className="text-indigo-700">sorted by likes</span>
      </h2>

      {competition.posts.length === 0 ? (
        <p className="text-muted-foreground font-bold">
          {isAdmin
            ? "No posts yet. Click \"Get Posts from Facebook\" to pull in competition entries."
            : "No posts fetched yet. Please wait for an admin to load the posts."}
        </p>
      ) : (
        <div className="space-y-4">
          {competition.posts.map((post, index) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow border-l-4 border-l-indigo-400">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-extrabold">
                    <span className="text-indigo-700">#{index + 1}</span> &mdash; {post.authorName}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 font-bold">
                      {post.likesCount} likes
                    </Badge>
                    <Badge variant="outline" className="border-blue-300 text-blue-600 font-bold">
                      {post.commentsCount} comments
                    </Badge>
                    {post.grades.length > 0 && (
                      <Badge className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold">
                        Graded by {post.grades.length} judge
                        {post.grades.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap mb-3 font-medium">
                  {post.content}
                </p>
                {post.imageUrl && (
                  <img
                    src={post.imageUrl}
                    alt="Post image"
                    className="rounded-lg max-h-64 object-cover shadow-sm"
                  />
                )}
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground font-bold">
                    Posted: {new Date(post.createdTime).toLocaleString()}
                  </p>
                  {post.postUrl && (
                    <a
                      href={post.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      View on Facebook →
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
