"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
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
import { Criterion, GradeScores } from "@/lib/types";

interface Grade {
  id: string;
  scores: string;
  totalScore: number;
  judge: { id: string; name: string };
}

interface Post {
  id: string;
  fbPostId: string;
  authorName: string;
  content: string;
  imageUrl: string | null;
  likesCount: number;
  commentsCount: number;
  createdTime: string;
  grades: Grade[];
}

interface Competition {
  id: string;
  name: string;
  hashtag: string;
  criteria: string;
  posts: Post[];
}

export default function GradePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [judgeName, setJudgeName] = useState("");
  const [judges, setJudges] = useState<string[]>([]);
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [scores, setScores] = useState<GradeScores>({});
  const [submitting, setSubmitting] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const loadCompetition = () => {
    fetch(`/api/competitions/${id}`)
      .then((r) => r.json())
      .then((data: Competition) => {
        setCompetition(data);
        // Initialize scores for criteria
        const criteria: Criterion[] = JSON.parse(data.criteria);
        const initial: GradeScores = {};
        criteria.forEach((c) => (initial[c.name] = 0));
        setScores(initial);
      })
      .finally(() => setLoading(false));
  };

  // Auto-fill judge name from session
  useEffect(() => {
    if (session?.user?.name && !judgeName) {
      setJudgeName(session.user.name);
    }
  }, [session, judgeName]);

  useEffect(() => {
    loadCompetition();
    fetch("/api/judges")
      .then((r) => r.json())
      .then((data: { name: string }[]) => setJudges(data.map((j) => j.name)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSubmitGrade = async () => {
    if (!judgeName.trim()) {
      alert("Please enter your judge name first.");
      return;
    }
    if (!competition) return;

    const post = competition.posts[currentPostIndex];
    setSubmitting(true);

    try {
      const res = await fetch("/api/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          judgeName: judgeName.trim(),
          competitionId: id,
          scores,
        }),
      });

      if (res.ok) {
        // Add judge name to list if new
        if (!judges.includes(judgeName.trim())) {
          setJudges([...judges, judgeName.trim()]);
        }
        // Reload and move to next
        loadCompetition();
        if (currentPostIndex < competition.posts.length - 1) {
          setCurrentPostIndex(currentPostIndex + 1);
        }
        // Reset scores
        const criteria: Criterion[] = JSON.parse(competition.criteria);
        const initial: GradeScores = {};
        criteria.forEach((c) => (initial[c.name] = 0));
        setScores(initial);
      } else {
        alert("Failed to submit grade.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  if (!competition || competition.posts.length === 0) {
    return (
      <p className="text-muted-foreground">
        No posts to grade. Fetch posts from the competition page first.
      </p>
    );
  }

  const criteria: Criterion[] = JSON.parse(competition.criteria);
  const currentPost = competition.posts[currentPostIndex];

  // Check if current judge already graded this post
  const existingGrade = currentPost.grades.find(
    (g) => g.judge.name === judgeName.trim()
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Grade: {competition.name}</h1>
          <p className="text-muted-foreground">
            Post {currentPostIndex + 1} of {competition.posts.length}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="judgeName" className="whitespace-nowrap">
            Judge Name:
          </Label>
          <Input
            id="judgeName"
            value={judgeName}
            onChange={(e) => setJudgeName(e.target.value)}
            placeholder="Enter your name"
            className="w-48"
            list="judge-list"
          />
          <datalist id="judge-list">
            {judges.map((j) => (
              <option key={j} value={j} />
            ))}
          </datalist>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Single View" : "Show All"}
          </Button>
        </div>
      </div>

      <Separator className="mb-6" />

      {showAll ? (
        // All posts view
        <div className="space-y-6">
          {competition.posts.map((post, idx) => (
            <PostGradeCard
              key={post.id}
              post={post}
              index={idx}
              criteria={criteria}
              judgeName={judgeName}
              competitionId={id}
              onGradeSubmitted={loadCompetition}
            />
          ))}
        </div>
      ) : (
        // Single post view
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Post content */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{currentPost.authorName}</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {currentPost.likesCount} likes
                  </Badge>
                  <Badge variant="outline">
                    {currentPost.commentsCount} comments
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm mb-4">
                {currentPost.content}
              </p>
              {currentPost.imageUrl && (
                <img
                  src={currentPost.imageUrl}
                  alt="Post image"
                  className="rounded-md max-h-96 object-cover w-full"
                />
              )}
            </CardContent>
          </Card>

          {/* Grading panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your Grade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {existingGrade && (
                  <div className="p-2 rounded bg-muted text-sm">
                    You already graded this post (total:{" "}
                    {existingGrade.totalScore}). Submitting will update your
                    score.
                  </div>
                )}
                {criteria.map((c) => (
                  <div key={c.name}>
                    <div className="flex items-center justify-between mb-1">
                      <Label>{c.name}</Label>
                      <span className="text-sm font-mono">
                        {scores[c.name] || 0} / {c.maxScore}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {Array.from({ length: c.maxScore }, (_, i) => i + 1).map(
                        (val) => (
                          <button
                            key={val}
                            onClick={() =>
                              setScores({ ...scores, [c.name]: val })
                            }
                            className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                              val <= (scores[c.name] || 0)
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted hover:bg-muted/80"
                            }`}
                          >
                            {val}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between font-semibold">
                  <span>Total</span>
                  <span>
                    {Object.values(scores).reduce((a, b) => a + b, 0)} /{" "}
                    {criteria.reduce((a, c) => a + c.maxScore, 0)}
                  </span>
                </div>
                <Button
                  onClick={handleSubmitGrade}
                  className="w-full"
                  disabled={submitting || !judgeName.trim()}
                >
                  {submitting ? "Submitting..." : "Submit Grade"}
                </Button>
              </CardContent>
            </Card>

            {/* Other judges' grades */}
            {currentPost.grades.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Other Judges&apos; Grades
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {currentPost.grades.map((grade) => {
                      const gradeScores: GradeScores = JSON.parse(
                        grade.scores
                      );
                      return (
                        <div
                          key={grade.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="font-medium">
                            {grade.judge.name}
                          </span>
                          <div className="flex gap-2">
                            {criteria.map((c) => (
                              <span key={c.name} className="text-muted-foreground">
                                {c.name}: {gradeScores[c.name] || 0}
                              </span>
                            ))}
                            <Badge variant="secondary">
                              Total: {grade.totalScore}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation */}
            <div className="flex gap-2 justify-between">
              <Button
                variant="outline"
                onClick={() =>
                  setCurrentPostIndex(Math.max(0, currentPostIndex - 1))
                }
                disabled={currentPostIndex === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  setCurrentPostIndex(
                    Math.min(
                      competition.posts.length - 1,
                      currentPostIndex + 1
                    )
                  )
                }
                disabled={currentPostIndex === competition.posts.length - 1}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component for "Show All" view
function PostGradeCard({
  post,
  index,
  criteria,
  judgeName,
  competitionId,
  onGradeSubmitted,
}: {
  post: Post;
  index: number;
  criteria: Criterion[];
  judgeName: string;
  competitionId: string;
  onGradeSubmitted: () => void;
}) {
  const [scores, setScores] = useState<GradeScores>(() => {
    const initial: GradeScores = {};
    // Pre-fill with existing grade if available
    const existing = post.grades.find(
      (g) => g.judge.name === judgeName.trim()
    );
    if (existing) {
      return JSON.parse(existing.scores);
    }
    criteria.forEach((c) => (initial[c.name] = 0));
    return initial;
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!judgeName.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/grades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId: post.id,
        judgeName: judgeName.trim(),
        competitionId,
        scores,
      }),
    });
    if (res.ok) {
      setSubmitted(true);
      onGradeSubmitted();
    }
    setSubmitting(false);
  };

  return (
    <Card className={submitted ? "border-green-300" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            #{index + 1} &mdash; {post.authorName}
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="secondary">{post.likesCount} likes</Badge>
            {post.grades.length > 0 && (
              <Badge>
                {post.grades.length} grade{post.grades.length > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm whitespace-pre-wrap mb-3">
          {post.content.substring(0, 300)}
          {post.content.length > 300 ? "..." : ""}
        </p>
        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt="Post image"
            className="rounded-md max-h-48 object-cover mb-3"
          />
        )}
        <Separator className="my-3" />
        <div className="flex flex-wrap gap-4">
          {criteria.map((c) => (
            <div key={c.name} className="space-y-1">
              <Label className="text-xs">{c.name}</Label>
              <div className="flex gap-1">
                {Array.from({ length: c.maxScore }, (_, i) => i + 1).map(
                  (val) => (
                    <button
                      key={val}
                      onClick={() =>
                        setScores({ ...scores, [c.name]: val })
                      }
                      className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                        val <= (scores[c.name] || 0)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      {val}
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
          <div className="flex items-end">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting || !judgeName.trim()}
            >
              {submitted ? "Updated" : submitting ? "..." : "Grade"}
            </Button>
          </div>
        </div>
        {/* Show other judges' grades */}
        {post.grades.length > 0 && (
          <div className="mt-3 text-xs text-muted-foreground">
            {post.grades.map((g) => (
              <span key={g.id} className="mr-3">
                {g.judge.name}: {g.totalScore}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
