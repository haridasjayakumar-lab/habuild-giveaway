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
