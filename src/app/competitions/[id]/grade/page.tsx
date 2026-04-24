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
        const criteria: Criterion[] = JSON.parse(data.criteria);
        const initial: GradeScores = {};
        criteria.forEach((c) => (initial[c.name] = 0));
        setScores(initial);
      })
      .finally(() => setLoading(false));
  };

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
        if (!judges.includes(judgeName.trim())) {
          setJudges([...judges, judgeName.trim()]);
        }
        loadCompetition();
        if (currentPostIndex < competition.posts.length - 1) {
          setCurrentPostIndex(currentPostIndex + 1);
        }
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
    return <p className="text-muted-foreground font-bold">Loading...</p>;
  }

  if (!competition || competition.posts.length === 0) {
    return (
      <p className="text-muted-foreground font-bold">
        No posts to grade. Fetch posts from the competition page first.
      </p>
    );
  }

  const criteria: Criterion[] = JSON.parse(competition.criteria);
  const currentPost = competition.posts[currentPostIndex];

  const existingGrade = currentPost.grades.find(
    (g) => g.judge.name === judgeName.trim()
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-slate-800">
            Grade: {competition.name}
          </h1>
          <p className="text-muted-foreground font-bold">
            Post <span className="text-indigo-700">{currentPostIndex + 1}</span> of <span className="text-indigo-700">{competition.posts.length}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="judgeName" className="whitespace-nowrap font-bold">
            Judge Name:
          </Label>
          <Input
            id="judgeName"
            value={judgeName}
            onChange={(e) => setJudgeName(e.target.value)}
            placeholder="Enter your name"
            className="w-48 font-bold"
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
            className="font-bold"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Single View" : "Show All"}
          </Button>
        </div>
      </div>

      <Separator className="mb-6" />

      {showAll ? (
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Post content */}
          <Card className="border-l-4 border-l-indigo-400">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-extrabold">{currentPost.authorName}</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 font-bold">
                    {currentPost.likesCount} likes
                  </Badge>
                  <Badge variant="outline" className="border-blue-300 text-blue-600 font-bold">
                    {currentPost.commentsCount} comments
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm mb-4 font-medium">
                {currentPost.content}
              </p>
              {currentPost.imageUrl && (
                <img
                  src={currentPost.imageUrl}
                  alt="Post image"
                  className="rounded-lg max-h-96 object-cover w-full shadow-sm"
                />
              )}
            </CardContent>
          </Card>

          {/* Grading panel */}
          <div className="space-y-4">
            <Card className="border-t-4 border-t-indigo-500">
              <CardHeader>
                <CardTitle className="text-base font-extrabold text-indigo-800">Your Grade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {existingGrade && (
                  <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-50 to-blue-50 text-sm font-bold text-indigo-800 border border-indigo-200">
                    You already graded this post (total:{" "}
                    {existingGrade.totalScore}). Submitting will update your
                    score.
                  </div>
                )}
                {criteria.map((c) => (
                  <div key={c.name}>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="font-bold">{c.name}</Label>
                      <span className="text-sm font-mono font-bold text-indigo-700">
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
                            className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                              val <= (scores[c.name] || 0)
                                ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm scale-105"
                                : "bg-gray-100 hover:bg-gray-200 text-gray-600"
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
                <div className="flex items-center justify-between font-extrabold text-lg">
                  <span>Total</span>
                  <span className="text-indigo-700">
                    {Object.values(scores).reduce((a, b) => a + b, 0)} /{" "}
                    {criteria.reduce((a, c) => a + c.maxScore, 0)}
                  </span>
                </div>
                <Button
                  onClick={handleSubmitGrade}
                  className="w-full bg-gradient-to-r from-indigo-700 to-blue-700 text-white font-bold hover:opacity-90 shadow-md"
                  disabled={submitting || !judgeName.trim()}
                >
                  {submitting ? "Submitting..." : "Submit Grade"}
                </Button>
              </CardContent>
            </Card>

            {/* Other judges' grades */}
            {currentPost.grades.length > 0 && (
              <Card className="border-t-4 border-t-teal-500">
                <CardHeader>
                  <CardTitle className="text-base font-extrabold text-teal-700">
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
                          <span className="font-bold">
                            {grade.judge.name}
                          </span>
                          <div className="flex gap-2">
                            {criteria.map((c) => (
                              <span key={c.name} className="text-muted-foreground font-bold">
                                {c.name}: {gradeScores[c.name] || 0}
                              </span>
                            ))}
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 font-bold">
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
                className="font-bold"
                onClick={() =>
                  setCurrentPostIndex(Math.max(0, currentPostIndex - 1))
                }
                disabled={currentPostIndex === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                className="font-bold"
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
    <Card className={`border-l-4 ${submitted ? "border-l-green-500 bg-green-50/30" : "border-l-indigo-400"}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-extrabold">
            <span className="text-indigo-700">#{index + 1}</span> &mdash; {post.authorName}
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 font-bold">
              {post.likesCount} likes
            </Badge>
            {post.grades.length > 0 && (
              <Badge className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold">
                {post.grades.length} grade{post.grades.length > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm whitespace-pre-wrap mb-3 font-medium">
          {post.content.substring(0, 300)}
          {post.content.length > 300 ? "..." : ""}
        </p>
        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt="Post image"
            className="rounded-lg max-h-48 object-cover mb-3 shadow-sm"
          />
        )}
        <Separator className="my-3" />
        <div className="flex flex-wrap gap-4">
          {criteria.map((c) => (
            <div key={c.name} className="space-y-1">
              <Label className="text-xs font-bold">{c.name}</Label>
              <div className="flex gap-1">
                {Array.from({ length: c.maxScore }, (_, i) => i + 1).map(
                  (val) => (
                    <button
                      key={val}
                      onClick={() =>
                        setScores({ ...scores, [c.name]: val })
                      }
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                        val <= (scores[c.name] || 0)
                          ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-600"
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
              className={`font-bold ${submitted ? "bg-green-600 hover:bg-green-700" : "bg-gradient-to-r from-indigo-700 to-blue-700 hover:opacity-90"}`}
            >
              {submitted ? "Updated!" : submitting ? "..." : "Grade"}
            </Button>
          </div>
        </div>
        {post.grades.length > 0 && (
          <div className="mt-3 text-xs font-bold text-muted-foreground">
            {post.grades.map((g) => (
              <span key={g.id} className="mr-3">
                {g.judge.name}: <span className="text-indigo-700">{g.totalScore}</span>
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
