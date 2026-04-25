import { prisma } from "@/lib/db";
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
        orderBy: { likesCount: "desc" },
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

  return NextResponse.json(competition);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { hashtag, postingWindowStart, postingWindowEnd, startDate, endDate } = body;

  const competition = await prisma.competition.update({
    where: { id },
    data: {
      ...(hashtag !== undefined && { hashtag }),
      ...(postingWindowStart !== undefined && { postingWindowStart: postingWindowStart || null }),
      ...(postingWindowEnd !== undefined && { postingWindowEnd: postingWindowEnd || null }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: new Date(endDate) }),
    },
  });

  return NextResponse.json(competition);
}
