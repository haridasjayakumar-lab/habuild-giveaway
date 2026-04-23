import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { postId, judgeName, competitionId, scores } = body;

  if (!postId || !judgeName || !competitionId || !scores) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Find or create judge
  let judge = await prisma.judge.findUnique({
    where: { name: judgeName },
  });
  if (!judge) {
    judge = await prisma.judge.create({
      data: { name: judgeName },
    });
  }

  const totalScore = Object.values(scores as Record<string, number>).reduce(
    (a, b) => a + b,
    0
  );

  // Upsert grade (one grade per judge per post)
  const grade = await prisma.grade.upsert({
    where: {
      postId_judgeId: {
        postId,
        judgeId: judge.id,
      },
    },
    update: {
      scores: JSON.stringify(scores),
      totalScore,
    },
    create: {
      postId,
      judgeId: judge.id,
      competitionId,
      scores: JSON.stringify(scores),
      totalScore,
    },
    include: { judge: true },
  });

  return NextResponse.json(grade);
}
