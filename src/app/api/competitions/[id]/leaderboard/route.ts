import { prisma } from "@/lib/db";
import { Criterion, GradeScores } from "@/lib/types";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const competition = await prisma.competition.findUnique({
    where: { id },
    include: {
      posts: {
        include: {
          grades: {
            include: { judge: true },
          },
        },
      },
    },
  });

  if (!competition) {
    return NextResponse.json(
      { error: "Competition not found" },
      { status: 404 }
    );
  }

  const criteria: Criterion[] = JSON.parse(competition.criteria);

  // Calculate aggregated scores for each post
  const leaderboard = competition.posts
    .map((post) => {
      const gradeCount = post.grades.length;
      if (gradeCount === 0) {
        return {
          postId: post.id,
          fbPostId: post.fbPostId,
          authorName: post.authorName,
          content: post.content.substring(0, 200),
          imageUrl: post.imageUrl,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          avgScores: {} as Record<string, number>,
          totalAvgScore: 0,
          gradeCount: 0,
          judges: [] as string[],
        };
      }

      // Average each criterion across judges
      const avgScores: Record<string, number> = {};
      for (const criterion of criteria) {
        const sum = post.grades.reduce((acc, grade) => {
          const scores: GradeScores = JSON.parse(grade.scores);
          return acc + (scores[criterion.name] || 0);
        }, 0);
        avgScores[criterion.name] = Math.round((sum / gradeCount) * 10) / 10;
      }

      const totalAvgScore = Object.values(avgScores).reduce(
        (a, b) => a + b,
        0
      );

      return {
        postId: post.id,
        fbPostId: post.fbPostId,
        authorName: post.authorName,
        content: post.content.substring(0, 200),
        imageUrl: post.imageUrl,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        avgScores,
        totalAvgScore: Math.round(totalAvgScore * 10) / 10,
        gradeCount,
        judges: post.grades.map((g) => g.judge.name),
      };
    })
    .sort((a, b) => b.totalAvgScore - a.totalAvgScore)
    .slice(0, 10);

  return NextResponse.json({ leaderboard, criteria });
}
