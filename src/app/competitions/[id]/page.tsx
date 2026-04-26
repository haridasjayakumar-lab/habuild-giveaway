"use client";

import { useEffect, useState, use, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Criterion, GradeScores } from "@/lib/types";

interface Grade {
  id: string;
  totalScore: number;
  scores: string;
  judge: { id: string; name: string };
}

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
  grades: Grade[];
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
  const [judgeName, setJudgeName] = useState("");
  const [judges, setJudges] = useState<string[]>([]);

  // Edit competition settings state
  const [showEditSettings, setShowEditSettings] = useState(false);
  const [editHashtag, setEditHashtag] = useState("");
  const [editUseTimeWindow, setEditUseTimeWindow] = useState(false);
  const [editWindowStart, setEditWindowStart] = useState("");
  const [editWindowEnd, setEditWindowEnd] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Add post by link
  const [postLink, setPostLink] = useState("");
  const [addingLink, setAddingLink] = useState(false);

  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";

  const loadCompetition = useCallback(() => {
    fetch(`/api/competitions/${id}`)
      .then((r) => r.json())
      .then((data: Competition) => {
        setCompetition(data);
        setEditHashtag(data.hashtag || "");
        setEditUseTimeWindow(!!(data.postingWindowStart && data.postingWindowEnd));
        setEditWindowStart(data.postingWindowStart || "");
        setEditWindowEnd(data.postingWindowEnd || "");
        setEditStartDate(data.startDate ? data.startDate.split("T")[0] : "");
        setEditEndDate(data.endDate ? data.endDate.split("T")[0] : "");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadCompetition();
    fetch("/api/judges")
      .then((r) => r.json())
      .then((data: { name: string }[]) => setJudges(data.map((j) => j.name)));
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

  const handleAddPostByLink = async () => {
    const url = postLink.trim();
    if (!url) return;
    setAddingLink(true);
    setFetchMessage("");
    try {
      const res = await fetch(`/api/competitions/${id}/upload-posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{
          fbPostId: url,
          authorName: "Unknown",
          authorProfileUrl: null,
          content: "",
          imageUrl: null,
          postUrl: url,
          likesCount: 0,
          commentsCount: 0,
          createdTime: new Date().toISOString(),
        }]),
      });
      const data = await res.json();
      if (res.ok) {
        setFetchMessage("Post added. Click the author name to fill in the correct name.");
        setPostLink("");
        loadCompetition();
      } else {
        setFetchMessage(`Error: ${data.error}`);
      }
    } finally {
      setAddingLink(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch(`/api/competitions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hashtag: editHashtag,
          postingWindowStart: editWindowStart || null,
          postingWindowEnd: editWindowEnd || null,
          startDate: editStartDate,
          endDate: editEndDate,
        }),
      });
      if (res.ok) {
        setFetchMessage("Competition settings saved.");
        setShowEditSettings(false);
        loadCompetition();
      } else {
        setFetchMessage("Failed to save settings.");
      }
    } finally {
      setSavingSettings(false);
    }
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
              <Button variant="outline" size="sm" className="font-bold" onClick={() => { setShowEditSettings(!showEditSettings); setShowFetchSettings(false); }}>
                Edit Settings
              </Button>
              <Button variant="outline" size="sm" className="font-bold" onClick={() => { setShowFetchSettings(!showFetchSettings); setShowEditSettings(false); }}>
                Fetch Settings
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
          <Link href={`/competitions/${id}/leaderboard`}>
            <Button variant="outline" className="font-bold border-teal-300 text-teal-700 hover:bg-teal-50">Leaderboard</Button>
          </Link>
        </div>
      </div>

      {/* Edit Competition Settings */}
      {isAdmin && showEditSettings && (
        <Card className="mb-4 border-amber-200 bg-amber-50/50">
          <CardContent className="pt-4 space-y-4">
            <h3 className="font-extrabold text-slate-800">Edit Competition Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="font-bold">Hashtag Filter</Label>
                <Input value={editHashtag} onChange={(e) => setEditHashtag(e.target.value)} placeholder="#giveaway" />
                <p className="text-xs text-muted-foreground mt-1">Leave blank to use time window instead</p>
              </div>
              <div></div>
              <div className="col-span-2 flex items-center gap-2">
                <input
                  id="editUseTimeWindow"
                  type="checkbox"
                  checked={editUseTimeWindow}
                  onChange={(e) => {
                    setEditUseTimeWindow(e.target.checked);
                    if (!e.target.checked) {
                      setEditWindowStart("");
                      setEditWindowEnd("");
                    }
                  }}
                  className="w-4 h-4 accent-indigo-600"
                />
                <Label htmlFor="editUseTimeWindow" className="font-bold cursor-pointer">Filter by posting time window (IST)</Label>
              </div>
              {editUseTimeWindow && (
                <>
                  <div>
                    <Label className="font-bold">Start Time</Label>
                    <Input type="time" value={editWindowStart} onChange={(e) => setEditWindowStart(e.target.value)} />
                  </div>
                  <div>
                    <Label className="font-bold">End Time</Label>
                    <Input type="time" value={editWindowEnd} onChange={(e) => setEditWindowEnd(e.target.value)} />
                  </div>
                </>
              )}
              <div>
                <Label className="font-bold">Start Date</Label>
                <Input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} />
              </div>
              <div>
                <Label className="font-bold">End Date</Label>
                <Input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveSettings} disabled={savingSettings} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                {savingSettings ? "Saving..." : "Save Settings"}
              </Button>
              <Button variant="outline" onClick={() => setShowEditSettings(false)} className="font-bold">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fetch Settings */}
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

      {/* Add post by link — admin only */}
      {isAdmin && <div className="mb-4 p-3 bg-green-50 rounded-xl border border-green-200 flex items-center gap-3 flex-wrap">
        <Label className="font-bold whitespace-nowrap text-green-800">Add Post by Link:</Label>
        <input
          type="url"
          value={postLink}
          onChange={(e) => setPostLink(e.target.value)}
          placeholder="Paste Facebook post URL here..."
          className="border border-green-300 rounded-lg px-3 py-1.5 text-sm font-medium flex-1 min-w-64 focus:outline-none focus:ring-2 focus:ring-green-400"
          onKeyDown={(e) => e.key === "Enter" && handleAddPostByLink()}
        />
        <Button
          onClick={handleAddPostByLink}
          disabled={addingLink || !postLink.trim()}
          className="bg-green-600 hover:bg-green-700 text-white font-bold"
          size="sm"
        >
          {addingLink ? "Adding..." : "Add Post"}
        </Button>
      </div>}

      {/* Judge name input */}
      <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3 flex-wrap">
        <Label htmlFor="judgeName" className="font-bold whitespace-nowrap text-slate-700">Your Name:</Label>
        <input
          id="judgeName"
          type="text"
          value={judgeName}
          onChange={(e) => setJudgeName(e.target.value)}
          placeholder="Type your name here"
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold w-52 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          autoComplete="off"
        />
        <p className="text-xs text-slate-500 font-bold">Enter your name first, then click Grade on any post row.</p>
      </div>

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
                  <th className="text-left px-3 py-2 font-extrabold text-slate-700 w-36">Author</th>
                  <th className="text-left px-3 py-2 font-extrabold text-slate-700">Post</th>
                  <th className="text-left px-3 py-2 font-extrabold text-slate-700 w-20">Likes</th>
                  <th className="text-left px-3 py-2 font-extrabold text-slate-700 w-44">Graded By</th>
                  <th className="text-left px-3 py-2 font-extrabold text-slate-700 w-44">Remarks</th>
                  <th className="text-left px-3 py-2 font-extrabold text-slate-700 w-28">Grade</th>
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
                    criteria={criteria}
                    judgeName={judgeName}
                    competitionId={id}
                    onDelete={handleDelete}
                    onRemarks={async (postId, remarks) => {
                      await fetch(`/api/competitions/${id}/posts/${postId}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ remarks }),
                      });
                    }}
                    onAuthorName={async (postId, authorName) => {
                      await fetch(`/api/competitions/${id}/posts/${postId}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ authorName }),
                      });
                    }}
                    onLikesCount={async (postId, likesCount) => {
                      await fetch(`/api/competitions/${id}/posts/${postId}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ likesCount }),
                      });
                    }}
                    onGraded={() => {
                      loadCompetition();
                      if (judgeName.trim() && !judges.includes(judgeName.trim())) {
                        setJudges([...judges, judgeName.trim()]);
                      }
                    }}
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
  criteria,
  judgeName,
  competitionId,
  onDelete,
  onRemarks,
  onAuthorName,
  onLikesCount,
  onGraded,
}: {
  post: Post;
  index: number;
  isAdmin: boolean;
  criteria: Criterion[];
  judgeName: string;
  competitionId: string;
  onDelete: (id: string) => void;
  onRemarks: (id: string, remarks: string) => void;
  onAuthorName: (id: string, authorName: string) => void;
  onLikesCount: (id: string, likesCount: number) => void;
  onGraded: () => void;
}) {
  const [remarks, setRemarks] = useState(post.remarks || "");
  const [authorName, setAuthorName] = useState(post.authorName || "");
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [editingLikes, setEditingLikes] = useState(false);
  const [showGrade, setShowGrade] = useState(false);
  const [scores, setScores] = useState<GradeScores>(() => {
    const initial: GradeScores = {};
    criteria.forEach((c) => (initial[c.name] = 0));
    return initial;
  });
  const [submitting, setSubmitting] = useState(false);

  const trimmedName = judgeName.trim();
  const myGrade = post.grades.find((g) => g.judge.name === trimmedName);
  // Post is graded by someone else (not me) — locked for current judge
  const gradedByOther = post.grades.length > 0 && !myGrade;
  // Post has no grades yet — anyone can grade
  const ungraded = post.grades.length === 0;

  const handleGrade = async () => {
    if (!trimmedName) {
      alert("Please enter your name in the 'Your Name' field above first.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          judgeName: trimmedName,
          competitionId,
          scores,
        }),
      });
      if (res.ok) {
        setShowGrade(false);
        onGraded();
      } else {
        alert("Failed to submit grade.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlockGrade = async (gradeId: string, judgeName: string) => {
    if (!confirm(`Remove ${judgeName}'s grade? They will be able to re-grade.`)) return;
    await fetch(`/api/grades/${gradeId}`, { method: "DELETE" });
    onGraded();
  };

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

  // Determine grade cell content
  let gradeCell: React.ReactNode;
  if (myGrade) {
    // I already graded — show my score + Edit button
    gradeCell = (
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-1 rounded">
          {myGrade.totalScore} pts
        </span>
        <button
          onClick={() => setShowGrade(!showGrade)}
          className="text-xs font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-1 rounded transition-colors"
        >
          {showGrade ? "Cancel" : "Edit"}
        </button>
        {isAdmin && (
          <button
            onClick={() => handleUnlockGrade(myGrade.id, trimmedName)}
            title="Admin: remove this grade"
            className="text-xs font-bold text-amber-600 hover:text-amber-800 px-1 py-1 rounded hover:bg-amber-50"
          >
            Unlock
          </button>
        )}
      </div>
    );
  } else if (gradedByOther) {
    // Someone else graded — locked for me
    gradeCell = (
      <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
        Locked
      </span>
    );
  } else {
    // No grades yet — I can grade
    gradeCell = (
      <button
        onClick={() => setShowGrade(!showGrade)}
        className="text-xs font-bold px-2 py-1 rounded transition-colors bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
      >
        {showGrade ? "Cancel" : "Grade"}
      </button>
    );
  }

  return (
    <>
      <tr className="border-b border-slate-100 hover:bg-slate-50 align-top">
        <td className="px-3 py-2 font-bold text-indigo-700">{index + 1}</td>
        <td className="px-3 py-2 font-bold text-slate-800">
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            onBlur={() => onAuthorName(post.id, authorName)}
            placeholder="Unknown"
            className="font-bold text-slate-800 w-full bg-transparent border-0 border-b border-transparent focus:border-indigo-400 focus:outline-none focus:bg-indigo-50 rounded px-1 py-0.5 text-sm transition-colors"
          />
        </td>
        <td className="px-3 py-2 text-slate-700">
          {post.postUrl ? (
            <a href={post.postUrl} target="_blank" rel="noopener noreferrer"
              className="text-sm font-bold text-indigo-600 hover:underline">
              View on Facebook →
            </a>
          ) : (
            <p className="line-clamp-2 text-xs font-medium text-slate-500">{post.content}</p>
          )}
        </td>
        <td className="px-3 py-2">
          {editingLikes ? (
            <input
              type="number"
              min={0}
              value={likesCount}
              autoFocus
              onChange={(e) => setLikesCount(parseInt(e.target.value) || 0)}
              onBlur={() => { setEditingLikes(false); onLikesCount(post.id, likesCount); }}
              className="font-extrabold text-blue-700 w-16 border border-indigo-400 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          ) : (
            <div>
              <span className="text-sm font-extrabold text-blue-700">{likesCount}</span>
              <span className="text-xs text-slate-400 ml-0.5">likes</span>
              <br />
              <button
                onClick={() => setEditingLikes(true)}
                className="text-xs font-bold text-indigo-500 hover:text-indigo-700 hover:underline"
              >
                Edit
              </button>
            </div>
          )}
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
                  {isAdmin && (
                    <button
                      onClick={() => handleUnlockGrade(g.id, g.judge.name)}
                      title="Remove this grade"
                      className="text-slate-400 hover:text-red-500 text-xs font-bold ml-0.5 leading-none"
                    >
                      ×
                    </button>
                  )}
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
        <td className="px-3 py-2">{gradeCell}</td>
        {isAdmin && (
          <td className="px-3 py-2">
            <button onClick={() => onDelete(post.id)}
              className="text-red-500 hover:text-red-700 font-bold text-xs px-2 py-1 rounded hover:bg-red-50 transition-colors">
              Delete
            </button>
          </td>
        )}
      </tr>
      {/* Grade expansion panel — only for my own grade or ungraded posts */}
      {showGrade && (ungraded || myGrade) && (
        <tr className="bg-indigo-50/60 border-b border-indigo-100">
          <td colSpan={isAdmin ? 8 : 7} className="px-4 py-3">
            <div className="flex flex-wrap gap-4 items-end">
              {criteria.map((c) => (
                <div key={c.name} className="space-y-1">
                  <span className="text-xs font-bold text-slate-700">{c.name} (max {c.maxScore})</span>
                  <div className="flex gap-1">
                    {Array.from({ length: c.maxScore }, (_, i) => i + 1).map((val) => (
                      <button
                        key={val}
                        onClick={() => setScores({ ...scores, [c.name]: val })}
                        className={`w-7 h-7 rounded text-xs font-bold transition-all ${
                          val <= (scores[c.name] || 0)
                            ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm"
                            : "bg-white border border-slate-200 hover:bg-slate-100 text-slate-600"
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex items-end gap-2">
                <span className="text-sm font-extrabold text-indigo-700">Total: {totalScore}</span>
                <Button
                  size="sm"
                  onClick={handleGrade}
                  disabled={submitting}
                  className="bg-gradient-to-r from-indigo-700 to-blue-700 text-white font-bold hover:opacity-90"
                >
                  {submitting ? "..." : myGrade ? "Update Grade" : "Submit Grade"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowGrade(false)} className="font-bold">
                  Cancel
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
