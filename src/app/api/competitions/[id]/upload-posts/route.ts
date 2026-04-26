import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const competition = await prisma.competition.findUnique({ where: { id } });

  if (!competition) {
    return NextResponse.json({ error: "Competition not found" }, { status: 404 });
  }


  let posts: {
    authorName: string;
    authorProfileUrl?: string | null;
    content: string;
    imageUrl?: string | null;
    postUrl?: string | null;
    likesCount?: number;
    commentsCount?: number;
    createdTime?: string;
  }[];

  try {
    posts = await req.json();
    if (!Array.isArray(posts)) throw new Error("Expected an array of posts");
  } catch (e) {
    return NextResponse.json(
      { error: `Invalid JSON: ${e instanceof Error ? e.message : e}` },
      { status: 400 }
    );
  }

  let created = 0;
  let updated = 0;

  for (const post of posts) {
    const createdTime = post.createdTime ? new Date(post.createdTime) : new Date();

    // Deduplicate by postUrl first (for link-added posts), then by authorName+content
    const existing = post.postUrl
      ? await prisma.post.findFirst({ where: { competitionId: id, postUrl: post.postUrl } })
      : await prisma.post.findFirst({
          where: {
            competitionId: id,
            authorName: post.authorName,
            content: { startsWith: post.content.substring(0, 100) },
          },
        });

    const fbPostId = post.postUrl || `${post.authorName}::${post.content.substring(0, 100)}`;

    if (existing) {
      // Don't overwrite authorName/likes if admin has already edited them
      await prisma.post.update({
        where: { id: existing.id },
        data: {
          likesCount: post.likesCount ?? existing.likesCount,
          commentsCount: post.commentsCount ?? existing.commentsCount,
          imageUrl: post.imageUrl ?? existing.imageUrl,
          postUrl: post.postUrl ?? existing.postUrl,
        },
      });
      updated++;
    } else {
      await prisma.post.create({
        data: {
          fbPostId,
          authorName: post.authorName,
          authorProfileUrl: post.authorProfileUrl ?? null,
          content: post.content,
          imageUrl: post.imageUrl ?? null,
          postUrl: post.postUrl ?? null,
          likesCount: post.likesCount ?? 0,
          commentsCount: post.commentsCount ?? 0,
          createdTime,
          competitionId: id,
        },
      });
      created++;
    }
  }

  return NextResponse.json({
    message: `Uploaded ${posts.length} posts. Created: ${created}, Updated: ${updated}`,
    total: posts.length,
    created,
    updated,
  });
}
