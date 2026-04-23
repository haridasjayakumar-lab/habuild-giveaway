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
 * Or invoked by the Next.js API route via child_process.
 * Outputs JSON to stdout.
 */

import { chromium, type Page } from "playwright";

interface ScrapedPost {
  fbPostId: string;
  authorName: string;
  authorProfileUrl: string | null;
  content: string;
  imageUrl: string | null;
  likesCount: number;
  commentsCount: number;
  createdTime: string; // ISO string
}

// ────────────────────── CLI Args ──────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    flags[args[i].replace(/^--/, "")] = args[i + 1];
  }
  return {
    groupUrl:
      flags.group || "https://www.facebook.com/groups/habuild",
    hashtag: flags.hashtag || "#giveaway",
    startDate: flags.startDate
      ? new Date(flags.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: flags.endDate ? new Date(flags.endDate) : new Date(),
    scrollCount: parseInt(flags.scrolls || "15", 10),
    cookiesPath: flags.cookies || "", // path to cookies JSON if you want logged-in session
  };
}

// ────────────────────── Helpers ──────────────────────

/** Scroll the page and wait for new content to load */
async function autoScroll(page: Page, scrollCount: number) {
  for (let i = 0; i < scrollCount; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
    // Wait a bit between scrolls for content to load
    await page.waitForTimeout(2000 + Math.random() * 1000);

    // Log progress to stderr (so it doesn't pollute JSON stdout)
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

/** Try to extract a rough date from Facebook's relative timestamps */
function parseFBDate(text: string): Date {
  const now = new Date();
  text = text.toLowerCase().trim();

  // "just now", "1 min", "1 hr"
  if (text.includes("just now")) return now;
  const minMatch = text.match(/(\d+)\s*m(?:in)?/);
  if (minMatch) {
    return new Date(now.getTime() - parseInt(minMatch[1]) * 60 * 1000);
  }
  const hrMatch = text.match(/(\d+)\s*h(?:r|our)?/);
  if (hrMatch) {
    return new Date(now.getTime() - parseInt(hrMatch[1]) * 3600 * 1000);
  }
  const dayMatch = text.match(/(\d+)\s*d/);
  if (dayMatch) {
    return new Date(
      now.getTime() - parseInt(dayMatch[1]) * 86400 * 1000
    );
  }
  // "Yesterday"
  if (text.includes("yesterday")) {
    return new Date(now.getTime() - 86400 * 1000);
  }
  // Try parsing as a date directly (e.g. "April 15" or "March 3, 2026")
  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) return parsed;

  // Fallback: return now
  return now;
}

// ────────────────────── Main Scraper ──────────────────────

async function scrape() {
  const opts = parseArgs();
  process.stderr.write(
    `Scraping ${opts.groupUrl} for ${opts.hashtag} (${opts.startDate.toISOString().split("T")[0]} to ${opts.endDate.toISOString().split("T")[0]})\n`
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
  });

  // Load cookies if provided (for logged-in session)
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

  // Navigate to the group
  await page.goto(opts.groupUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // Handle cookie consent / login walls if they appear
  try {
    const closeBtn = page.locator('[aria-label="Close"]').first();
    if (await closeBtn.isVisible({ timeout: 3000 })) {
      await closeBtn.click();
      await page.waitForTimeout(1000);
    }
  } catch {
    // No close button, that's fine
  }

  // Scroll to load more posts
  process.stderr.write(`Scrolling ${opts.scrollCount} times to load posts...\n`);
  await autoScroll(page, opts.scrollCount);

  // Extract posts from the page
  process.stderr.write("Extracting posts...\n");

  const posts = await page.evaluate(() => {
    const results: Array<{
      id: string;
      authorName: string;
      authorUrl: string | null;
      content: string;
      imageUrl: string | null;
      reactionsText: string;
      commentsText: string;
      dateText: string;
    }> = [];

    // Facebook group posts are rendered as feed items
    // We look for the post containers using various selectors
    const postElements = document.querySelectorAll(
      '[role="article"], [data-pagelet^="FeedUnit"], .userContentWrapper'
    );

    const seen = new Set<string>();

    postElements.forEach((el, i) => {
      // Get post text content
      const textEl =
        el.querySelector('[data-ad-preview="message"]') ||
        el.querySelector('[data-testid="post_message"]') ||
        el.querySelector(".userContent") ||
        // Modern FB: look for the div that contains the post text
        el.querySelector('div[dir="auto"][style*="text-align"]') ||
        el.querySelector('div[dir="auto"]');

      const content = textEl?.textContent?.trim() || "";
      if (!content) return;

      // Skip duplicates by content hash
      const hash = content.substring(0, 100);
      if (seen.has(hash)) return;
      seen.add(hash);

      // Author name
      const authorEl =
        el.querySelector("h2 a, h3 a, strong a, h4 a") ||
        el.querySelector('a[role="link"] strong')?.closest("a") ||
        el.querySelector('a[role="link"]');
      const authorName = authorEl?.textContent?.trim() || "Unknown";
      const authorUrl =
        authorEl?.getAttribute("href")?.split("?")[0] || null;

      // Image
      const imgEl = el.querySelector(
        'img[src*="scontent"], img[src*="fbcdn"]'
      );
      const imageUrl = imgEl?.getAttribute("src") || null;

      // Reactions (likes) count
      const reactionsEl =
        el.querySelector('[aria-label*="reaction"], [aria-label*="like"]') ||
        el.querySelector(
          'span[role="toolbar"]'
        )?.parentElement?.querySelector("span");
      const reactionsText = reactionsEl?.textContent?.trim() || "0";

      // Comments count
      const commentsEl = Array.from(el.querySelectorAll("span")).find(
        (span) =>
          span.textContent?.match(/\d+\s*(comment|reply)/i)
      );
      const commentsText = commentsEl?.textContent?.trim() || "0";

      // Date / timestamp
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

  // Filter and transform
  const hashtagLower = opts.hashtag.toLowerCase().replace("#", "");
  const filtered: ScrapedPost[] = [];

  for (const post of posts) {
    // Filter by hashtag
    if (!post.content.toLowerCase().includes(`#${hashtagLower}`)) continue;

    const createdTime = parseFBDate(post.dateText);

    // Filter by date range
    if (createdTime < opts.startDate || createdTime > opts.endDate) continue;

    filtered.push({
      fbPostId: post.id,
      authorName: post.authorName,
      authorProfileUrl: post.authorUrl,
      content: post.content,
      imageUrl: post.imageUrl,
      likesCount: parseReactionCount(post.reactionsText),
      commentsCount: parseReactionCount(
        post.commentsText.replace(/[^0-9km.]/gi, "")
      ),
      createdTime: createdTime.toISOString(),
    });
  }

  // Sort by likes descending
  filtered.sort((a, b) => b.likesCount - a.likesCount);

  process.stderr.write(
    `Filtered to ${filtered.length} posts matching ${opts.hashtag}\n`
  );

  await browser.close();

  // Output JSON to stdout for the API to consume
  console.log(JSON.stringify(filtered));
}

scrape().catch((err) => {
  process.stderr.write(`Scraper error: ${err.message}\n`);
  process.exit(1);
});
