import { prisma } from "@/lib/db";
import { ParsedPost } from "@/lib/facebook";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const competition = await prisma.competition.findUnique({
    where: { id },
  });

  if (!competition) {
    return NextResponse.json(
      { error: "Competition not found" },
      { status: 404 }
    );
  }

  let groupUrl = "https://www.facebook.com/groups/habuild";
  let scrollCount = 15;
  let cookiesPath = "";
  try {
    const body = await req.json();
    if (body.groupUrl) groupUrl = body.groupUrl;
    if (body.scrollCount) scrollCount = Number(body.scrollCount);
    if (body.cookiesPath) cookiesPath = body.cookiesPath;
  } catch {
    // No body or invalid JSON — use defaults
  }

  try {
    const { scrape } = await import("@/../scripts/scrape-facebook");
    const scrapedPosts = await scrape({
      groupUrl,
      hashtag: competition.hashtag,
      startDate: competition.startDate,
      endDate: competition.endDate,
      scrollCount,
      cookiesPath: cookiesPath || undefined,
    });

    const posts: ParsedPost[] = scrapedPosts.map((p) => ({
      ...p,
      createdTime: new Date(p.createdTime),
    }));

    let created = 0;
    let updated = 0;
    for (const post of posts) {
      const existing = await prisma.post.findFirst({
        where: {
          competitionId: id,
          authorName: post.authorName,
          content: { startsWith: post.content.substring(0, 100) },
        },
      });

      const contentKey = `${post.authorName}::${post.content.substring(0, 100)}`;

      if (existing) {
        await prisma.post.update({
          where: { id: existing.id },
          data: {
            likesCount: post.likesCount,
            commentsCount: post.commentsCount,
            content: post.content,
            imageUrl: post.imageUrl,
          },
        });
        updated++;
      } else {
        await prisma.post.create({
          data: {
            fbPostId: contentKey,
            authorName: post.authorName,
            authorProfileUrl: post.authorProfileUrl,
            content: post.content,
            imageUrl: post.imageUrl,
            likesCount: post.likesCount,
            commentsCount: post.commentsCount,
            createdTime: post.createdTime,
            competitionId: id,
          },
        });
        created++;
      }
    }

    return NextResponse.json({
      message: `Scraped ${posts.length} posts. Created: ${created}, Updated: ${updated}`,
      total: posts.length,
      created,
      updated,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error scraping posts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
