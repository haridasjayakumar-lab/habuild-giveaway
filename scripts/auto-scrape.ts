/**
 * Auto-scrape script for GitHub Actions.
 * Fetches all active competitions, scrapes Facebook for each, and uploads results.
 *
 * Required env vars:
 *   APP_URL       - e.g. https://habuild-giveaway.vercel.app
 *   UPLOAD_SECRET - must match UPLOAD_SECRET on Vercel
 */

import { scrape } from "./scrape-facebook";

const APP_URL = process.env.APP_URL;
const UPLOAD_SECRET = process.env.UPLOAD_SECRET;

if (!APP_URL || !UPLOAD_SECRET) {
  console.error("Missing APP_URL or UPLOAD_SECRET env vars");
  process.exit(1);
}

interface Competition {
  id: string;
  name: string;
  hashtag: string;
  startDate: string;
  endDate: string;
  postingWindowStart?: string | null;
  postingWindowEnd?: string | null;
}

async function main() {
  // Fetch all competitions
  const res = await fetch(`${APP_URL}/api/competitions`);
  if (!res.ok) {
    console.error("Failed to fetch competitions:", await res.text());
    process.exit(1);
  }
  const competitions: Competition[] = await res.json();

  // Only scrape competitions that are active or recently ended (within 3 days)
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const active = competitions.filter((c) => new Date(c.endDate) >= cutoff);

  console.log(`Found ${active.length} active competition(s) to scrape`);

  for (const competition of active) {
    console.log(`\nScraping: ${competition.name} (${competition.hashtag})`);
    try {
      const posts = await scrape({
        groupUrl: "https://www.facebook.com/groups/habuild",
        hashtag: competition.hashtag && competition.hashtag.replace("#", "").trim() ? competition.hashtag : undefined,
        startDate: new Date(competition.startDate),
        endDate: new Date(competition.endDate),
        scrollCount: 50,
        cookiesPath: process.env.FB_COOKIES_PATH || undefined,
        postingWindowStart: competition.postingWindowStart || undefined,
        postingWindowEnd: competition.postingWindowEnd || undefined,
      });

      console.log(`Scraped ${posts.length} posts, uploading...`);

      const uploadRes = await fetch(
        `${APP_URL}/api/competitions/${competition.id}/upload-posts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-upload-secret": UPLOAD_SECRET!,
          },
          body: JSON.stringify(posts),
        }
      );

      const result = await uploadRes.json();
      if (uploadRes.ok) {
        console.log(`✓ ${result.message}`);
      } else {
        console.error(`✗ Upload failed: ${result.error}`);
      }
    } catch (err) {
      console.error(`✗ Failed to scrape ${competition.name}:`, err);
    }
  }
}

main();
