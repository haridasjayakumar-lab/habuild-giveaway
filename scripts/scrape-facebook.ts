/**
 * Playwright-based Facebook group scraper.
 *
 * Run standalone:
 *   npx tsx scripts/scrape-facebook.ts \
 *     --group "https://www.facebook.com/groups/habuild" \
 *     --hashtag "#giveaway" \
 *     --startDate "2026-01-01" \
 *     --endDate "2026-04-30" \
 *     --scrolls 20
 *
 * Or imported and called directly from the Next.js API route.
 * Outputs JSON to stdout when run as CLI.
 */

import { chromium, type Page } from "playwright-core";

export interface ScrapedPost {
  fbPostId: string;
  authorName: string;
  authorProfileUrl: string | null;
  content: string;
  imageUrl: string | null;
  postUrl: string | null;
  likesCount: number;
  commentsCount: number;
  createdTime: string; // ISO string
}

export interface ScrapeOptions {
  groupUrl: string;
  hashtag?: string;
  startDate: Date;
  endDate: Date;
  scrollCount: number;
  cookiesPath?: string;
  postingWindowStart?: string; // "HH:MM" IST
  postingWindowEnd?: string;   // "HH:MM" IST
}

// ────────────────────── Helpers ──────────────────────

/** Scroll the page and wait for new content to load */
async function autoScroll(page: Page, scrollCount: number) {
  for (let i = 0; i < scrollCount; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
    await page.waitForTimeout(2000 + Math.random() * 1000);
    process.stderr.write(`\rScrolled ${i + 1}/${scrollCount}...`);
  }
  process.stderr.write("\n");
}

/** Parse a reaction count string like "1.2K" or "453" into a number */
function parseReactionCount(text: string): number {
  if (!text) return 0;
  text = text.trim().toLowerCase();
  if (text.includes("k")) {
    return Math.round(parseFloat(text) * 1000);
  }
  if (text.includes("m")) {
    return Math.round(parseFloat(text) * 1_000_000);
  }
  return parseInt(text.replace(/[^0-9]/g, ""), 10) || 0;
}

/** Try to extract a rough date from Facebook's relative timestamps. Returns null if unparseable. */
function parseFBDate(text: string): Date | null {
  if (!text) return null;
  const now = new Date();
  text = text.toLowerCase().trim();

  if (text.includes("just now")) return now;
  const minMatch = text.match(/(\d+)\s*m(?:in)?/);
  if (minMatch) {
    return new Date(now.getTime() - parseInt(minMatch[1]) * 60 * 1000);
  }
  const hrMatch = text.match(/(\d+)\s*h(?:r|our)?/);
  if (hrMatch) {
    return new Date(now.getTime() - parseInt(hrMatch[1]) * 3600 * 1000);
  }
  const wkMatch = text.match(/(\d+)\s*w/);
  if (wkMatch) {
    return new Date(now.getTime() - parseInt(wkMatch[1]) * 7 * 86400 * 1000);
  }
  const dayMatch = text.match(/(\d+)\s*d/);
  if (dayMatch) {
    return new Date(now.getTime() - parseInt(dayMatch[1]) * 86400 * 1000);
  }
  if (text.includes("yesterday")) {
    return new Date(now.getTime() - 86400 * 1000);
  }
  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) return parsed;

  return null; // unparseable — caller will decide what to do
}

/** Check if a date falls within a time window (IST = UTC+5:30) */
function isWithinTimeWindow(date: Date, start: string, end: string): boolean {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffsetMs);
  const totalMinutes = istDate.getUTCHours() * 60 + istDate.getUTCMinutes();
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return totalMinutes >= sh * 60 + sm && totalMinutes <= eh * 60 + em;
}

// ────────────────────── Main Scraper ──────────────────────

export async function scrape(opts: ScrapeOptions): Promise<ScrapedPost[]> {
  process.stderr.write(
    `Scraping ${opts.groupUrl} for ${opts.hashtag} (${opts.startDate.toISOString().split("T")[0]} to ${opts.endDate.toISOString().split("T")[0]})\n`
  );

  const isVercel = !!process.env.VERCEL;
  let executablePath: string | undefined;
  if (isVercel) {
    const chromiumMin = await import("@sparticuz/chromium-min");
    executablePath = await chromiumMin.default.executablePath(
      "https://github.com/Sparticuz/chromium/releases/download/v147.0.2/chromium-v147.0.2-pack.x64.tar"
    );
  }
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-zygote",
      "--single-process",
    ],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
  });

  if (opts.cookiesPath) {
    try {
      const fs = await import("fs");
      const cookies = JSON.parse(
        fs.readFileSync(opts.cookiesPath, "utf-8")
      );
      await context.addCookies(cookies);
      process.stderr.write("Loaded cookies for authenticated session\n");
    } catch (e) {
      process.stderr.write(
        `Warning: could not load cookies from ${opts.cookiesPath}: ${e}\n`
      );
    }
  }

  const page = await context.newPage();

  // If hashtag provided, search for it; otherwise load the group feed sorted by recent
  const targetUrl = opts.hashtag
    ? `${opts.groupUrl}/search/?q=${encodeURIComponent(opts.hashtag)}`
    : `${opts.groupUrl}?sorting_setting=RECENT_ACTIVITY`;
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  try {
    const closeBtn = page.locator('[aria-label="Close"]').first();
    if (await closeBtn.isVisible({ timeout: 3000 })) {
      await closeBtn.click();
      await page.waitForTimeout(1000);
    }
  } catch {
    // No close button, that's fine
  }

  process.stderr.write(`Scrolling ${opts.scrollCount} times to load posts...\n`);
  await autoScroll(page, opts.scrollCount);

  process.stderr.write("Extracting posts...\n");

  const posts = await page.evaluate(() => {
    const results: Array<{
      id: string;
      authorName: string;
      authorUrl: string | null;
      postUrl: string | null;
      content: string;
      imageUrl: string | null;
      reactionsText: string;
      commentsText: string;
      dateText: string;
    }> = [];

    const postElements = document.querySelectorAll(
      '[role="article"], [data-pagelet^="FeedUnit"], .userContentWrapper'
    );

    const seen = new Set<string>();

    postElements.forEach((el, i) => {
      const textEl =
        el.querySelector('[data-ad-preview="message"]') ||
        el.querySelector('[data-testid="post_message"]') ||
        el.querySelector(".userContent") ||
        el.querySelector('div[dir="auto"][style*="text-align"]') ||
        el.querySelector('div[dir="auto"]');

      const content = textEl?.textContent?.trim() || "";
      if (!content) return;

      const hash = content.substring(0, 100);
      if (seen.has(hash)) return;
      seen.add(hash);

      // Post URL
      const postLinkEl = el.querySelector('a[href*="/posts/"], a[href*="/groups/"][href*="?id="]');
      const postUrl = postLinkEl ? postLinkEl.getAttribute("href")?.split("?")[0] || null : null;

      // Try multiple strategies to find author name
      const authorEl =
        el.querySelector("h2 a, h3 a, h4 a") ||
        el.querySelector('a[role="link"] strong')?.closest("a") ||
        el.querySelector('strong a') ||
        el.querySelector('a[role="link"]');

      // Also try finding author from profile links (exclude group/post links)
      const allLinks = Array.from(el.querySelectorAll('a[href]'));
      const profileLink = allLinks.find((a) => {
        const href = a.getAttribute("href") || "";
        return (
          (href.includes("/user/") || href.includes("profile.php") ||
          (href.startsWith("https://www.facebook.com/") && !href.includes("/groups/") && !href.includes("/posts/") && !href.includes("/events/"))) &&
          a.textContent?.trim() && a.textContent.trim().length > 1
        );
      });

      const authorName =
        authorEl?.textContent?.trim() ||
        profileLink?.textContent?.trim() ||
        "Unknown";
      const authorUrl =
        (authorEl || profileLink)?.getAttribute("href")?.split("?")[0] || null;

      const imgEl = el.querySelector(
        'img[src*="scontent"], img[src*="fbcdn"]'
      );
      const imageUrl = imgEl?.getAttribute("src") || null;

      const reactionsEl =
        el.querySelector('[aria-label*="reaction"], [aria-label*="like"]') ||
        el.querySelector(
          'span[role="toolbar"]'
        )?.parentElement?.querySelector("span");
      const reactionsText = reactionsEl?.textContent?.trim() || "0";

      const commentsEl = Array.from(el.querySelectorAll("span")).find(
        (span) =>
          span.textContent?.match(/\d+\s*(comment|reply)/i)
      );
      const commentsText = commentsEl?.textContent?.trim() || "0";

      const dateEl =
        el.querySelector("abbr") ||
        el.querySelector('[data-utime]') ||
        el.querySelector('a[href*="/posts/"] span') ||
        el.querySelector('span[id] a');
      const dateText = dateEl?.textContent?.trim() || "";

      results.push({
        id: `post_${i}_${Date.now()}`,
        authorName,
        authorUrl,
        postUrl,
        content,
        imageUrl,
        reactionsText,
        commentsText,
        dateText,
      });
    });

    return results;
  });

  process.stderr.write(`Found ${posts.length} raw posts\n`);

  const useTimeWindow = !!(opts.postingWindowStart && opts.postingWindowEnd);
  const useHashtag = !!opts.hashtag;

  let hashtagLower = "", hashtagWords: string[] = [], hashtagAlpha = "";
  if (useHashtag && opts.hashtag) {
    hashtagLower = opts.hashtag.toLowerCase().replace("#", "");
    hashtagWords = opts.hashtag
      .replace("#", "")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);
    hashtagAlpha = hashtagLower.replace(/[^a-z0-9]/g, "");
  }

  const filtered: ScrapedPost[] = [];

  for (const post of posts) {
    const createdTime = parseFBDate(post.dateText);

    // If date is unreadable, include the post anyway
    if (createdTime && (createdTime < opts.startDate || createdTime > opts.endDate)) continue;

    if (useHashtag) {
      const contentLower = post.content.toLowerCase();
      const contentAlpha = contentLower.replace(/[^a-z0-9]/g, "");
      const hasExactHashtag = contentLower.includes(`#${hashtagLower}`);
      const hasAlphaMatch = contentAlpha.includes(hashtagAlpha);
      const hasAllWords = hashtagWords.length > 1 && hashtagWords.every((w) => contentLower.includes(w));
      if (!hasExactHashtag && !hasAlphaMatch && !hasAllWords) continue;
    }

    if (useTimeWindow) {
      if (!isWithinTimeWindow(createdTime, opts.postingWindowStart!, opts.postingWindowEnd!)) continue;
    }

    filtered.push({
      fbPostId: post.id,
      authorName: post.authorName,
      authorProfileUrl: post.authorUrl,
      content: post.content,
      imageUrl: post.imageUrl,
      postUrl: post.postUrl,
      likesCount: parseReactionCount(post.reactionsText),
      commentsCount: parseReactionCount(
        post.commentsText.replace(/[^0-9km.]/gi, "")
      ),
      createdTime: (createdTime ?? new Date()).toISOString(),
    });
  }

  filtered.sort((a, b) => b.likesCount - a.likesCount);

  process.stderr.write(
    `Filtered to ${filtered.length} posts\n`
  );

  await browser.close();

  return filtered;
}

// ────────────────────── CLI entry point ──────────────────────

if (process.argv[1] === import.meta.filename || process.argv[1]?.endsWith("scrape-facebook.ts")) {
  function parseArgs(): ScrapeOptions {
    const args = process.argv.slice(2);
    const flags: Record<string, string> = {};
    for (let i = 0; i < args.length; i += 2) {
      flags[args[i].replace(/^--/, "")] = args[i + 1];
    }
    return {
      groupUrl: flags.group || "https://www.facebook.com/groups/habuild",
      hashtag: flags.hashtag || undefined,
      startDate: flags.startDate
        ? new Date(flags.startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: flags.endDate ? new Date(flags.endDate) : new Date(),
      scrollCount: parseInt(flags.scrolls || "15", 10),
      cookiesPath: flags.cookies || "",
      postingWindowStart: flags.windowStart || undefined,
      postingWindowEnd: flags.windowEnd || undefined,
    };
  }

  scrape(parseArgs())
    .then((posts) => console.log(JSON.stringify(posts)))
    .catch((err) => {
      process.stderr.write(`Scraper error: ${err.message}\n`);
      process.exit(1);
    });
}
