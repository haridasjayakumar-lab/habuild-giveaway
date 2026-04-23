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
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [fetchMessage, setFetchMessage] = useState("");
  const [scrollCount, setScrollCount] = useState(15);
  const [showScrapeSettings, setShowScrapeSettings] = useState(false);

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
      setFetchMessage("Failed to scrape posts from Facebook.");
    } finally {
      setFetching(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading competition...</p>;
  }

  if (!competition) {
    return <p className="text-destructive">Competition not found.</p>;
  }

  const criteria: Criterion[] = JSON.parse(competition.criteria);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{competition.name}</h1>
          <p className="text-muted-foreground">
            <span className="font-mono">{competition.hashtag}</span> &middot;{" "}
            {new Date(competition.startDate).toLocaleDateString()} &mdash;{" "}
            {new Date(competition.endDate).toLocaleDateString()}
          </p>
          <div className="flex gap-2 mt-2">
            {criteria.map((c) => (
              <Badge key={c.name} variant="outline">
                {c.name} (max {c.maxScore})
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowScrapeSettings(!showScrapeSettings)}
          >
            Scrape Settings
          </Button>
          <Button onClick={handleFetchPosts} disabled={fetching}>
            {fetching ? "Scraping..." : "Scrape Posts from Facebook"}
          </Button>
          <Link href={`/competitions/${id}/grade`}>
            <Button variant="outline">Grade Posts</Button>
          </Link>
          <Link href={`/competitions/${id}/leaderboard`}>
            <Button variant="outline">Leaderboard</Button>
          </Link>
        </div>
      </div>

      {showScrapeSettings && (
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="flex gap-4 items-end">
              <div>
                <Label htmlFor="scrollCount">Scroll Depth</Label>
                <Input
                  id="scrollCount"
                  type="number"
                  min={1}
                  max={100}
                  value={scrollCount}
                  onChange={(e) => setScrollCount(parseInt(e.target.value) || 15)}
                  className="w-24"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  More scrolls = more posts loaded (each scroll ~ 2-3 sec)
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Uses Playwright to scrape the public Facebook group page. For
              private groups, export your Facebook cookies to{" "}
              <code>fb-cookies.json</code> in the project root.
            </p>
          </CardContent>
        </Card>
      )}

      {fetchMessage && (
        <div className="mb-4 p-3 rounded-md bg-muted text-sm">
          {fetchMessage}
        </div>
      )}

      <Separator className="mb-6" />

      <h2 className="text-lg font-semibold mb-4">
        Posts ({competition.posts.length}) &mdash; sorted by likes
      </h2>

      {competition.posts.length === 0 ? (
        <p className="text-muted-foreground">
          No posts yet. Click &quot;Scrape Posts from Facebook&quot; to pull in
          competition entries.
        </p>
      ) : (
        <div className="space-y-4">
          {competition.posts.map((post, index) => (
            <Card key={post.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    #{index + 1} &mdash; {post.authorName}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="secondary">
                      {post.likesCount} likes
                    </Badge>
                    <Badge variant="outline">
                      {post.commentsCount} comments
                    </Badge>
                    {post.grades.length > 0 && (
                      <Badge>
                        Graded by {post.grades.length} judge
                        {post.grades.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap mb-3">
                  {post.content}
                </p>
                {post.imageUrl && (
                  <img
                    src={post.imageUrl}
                    alt="Post image"
                    className="rounded-md max-h-64 object-cover"
                  />
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Posted: {new Date(post.createdTime).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
