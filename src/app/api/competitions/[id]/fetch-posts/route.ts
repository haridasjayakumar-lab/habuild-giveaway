import { NextResponse } from "next/server";

export async function POST() {
  const token = process.env.GH_PAT;
  if (!token) {
    return NextResponse.json(
      { error: "GH_PAT environment variable is not set. Add it in Vercel settings." },
      { status: 500 }
    );
  }

  const res = await fetch(
    "https://api.github.com/repos/haridasjayakumar-lab/habuild-giveaway/actions/workflows/scrape.yml/dispatches",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main" }),
    }
  );

  if (res.status === 204) {
    return NextResponse.json({
      message: "Scraper started! Posts will appear in about 2–3 minutes. Refresh the page then.",
    });
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(
    { error: data.message || "Failed to trigger scraper." },
    { status: res.status }
  );
}
