import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const competitions = await prisma.competition.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { posts: true, grades: true } },
    },
  });
  return NextResponse.json(competitions);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, hashtag, startDate, endDate, criteria, postingWindowStart, postingWindowEnd } = body;

  if (!name || !startDate || !endDate || !criteria) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const competition = await prisma.competition.create({
    data: {
      name,
      hashtag: hashtag || "",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      criteria: JSON.stringify(criteria),
      postingWindowStart: postingWindowStart || null,
      postingWindowEnd: postingWindowEnd || null,
    },
  });

  return NextResponse.json(competition, { status: 201 });
}
