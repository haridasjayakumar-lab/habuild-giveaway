"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Criterion } from "@/lib/types";

export default function NewCompetition() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [hashtag, setHashtag] = useState("#");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [criteria, setCriteria] = useState<Criterion[]>([
    { name: "Creativity", maxScore: 10 },
    { name: "Effort", maxScore: 10 },
    { name: "Relevance", maxScore: 10 },
  ]);
  const [postingWindowStart, setPostingWindowStart] = useState("");
  const [postingWindowEnd, setPostingWindowEnd] = useState("");
  const [saving, setSaving] = useState(false);

  const addCriterion = () => {
    setCriteria([...criteria, { name: "", maxScore: 10 }]);
  };

  const removeCriterion = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const updateCriterion = (
    index: number,
    field: keyof Criterion,
    value: string | number
  ) => {
    const updated = [...criteria];
    updated[index] = { ...updated[index], [field]: value };
    setCriteria(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/competitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        hashtag,
        startDate,
        endDate,
        criteria: criteria.filter((c) => c.name.trim()),
        postingWindowStart: postingWindowStart || undefined,
        postingWindowEnd: postingWindowEnd || undefined,
      }),
    });

    if (res.ok) {
      const comp = await res.json();
      router.push(`/competitions/${comp.id}`);
    } else {
      setSaving(false);
      alert("Failed to create competition");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-heading font-black text-slate-800 mb-6">Create New Competition</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Info</CardTitle>
            <CardDescription>
              Define the competition name, hashtag, and date range.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Competition Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., January Fitness Challenge"
                required
              />
            </div>
            <div>
              <Label htmlFor="hashtag">Hashtag Filter</Label>
              <Input
                id="hashtag"
                value={hashtag}
                onChange={(e) => setHashtag(e.target.value)}
                placeholder="#giveaway"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Only posts containing this hashtag will be fetched. Leave blank if using posting window instead.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="postingWindowStart">Posting Window Start (IST)</Label>
                <Input
                  id="postingWindowStart"
                  type="time"
                  value={postingWindowStart}
                  onChange={(e) => setPostingWindowStart(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="postingWindowEnd">Posting Window End (IST)</Label>
                <Input
                  id="postingWindowEnd"
                  type="time"
                  value={postingWindowEnd}
                  onChange={(e) => setPostingWindowEnd(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Optional: only fetch posts made between these times each day (e.g. 3:00 PM – 7:00 PM IST). Use this instead of a hashtag.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Grading Criteria</CardTitle>
            <CardDescription>
              Define the criteria judges will use to score each post. Each
              criterion has a name and maximum score.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {criteria.map((c, i) => (
              <div key={i} className="flex items-end gap-3">
                <div className="flex-1">
                  <Label>Criterion Name</Label>
                  <Input
                    value={c.name}
                    onChange={(e) =>
                      updateCriterion(i, "name", e.target.value)
                    }
                    placeholder="e.g., Creativity"
                  />
                </div>
                <div className="w-24">
                  <Label>Max Score</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={c.maxScore}
                    onChange={(e) =>
                      updateCriterion(i, "maxScore", parseInt(e.target.value))
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCriterion(i)}
                  disabled={criteria.length <= 1}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addCriterion}>
              + Add Criterion
            </Button>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full bg-gradient-to-r from-indigo-700 to-blue-700 text-white font-bold hover:opacity-90" disabled={saving}>
          {saving ? "Creating..." : "Create Competition"}
        </Button>
      </form>
    </div>
  );
}
