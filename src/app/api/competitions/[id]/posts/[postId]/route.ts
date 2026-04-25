import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  const { postId } = await params;
  await prisma.post.delete({ where: { id: postId } });
  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  const { postId } = await params;
  const { remarks } = await req.json();
  const post = await prisma.post.update({
    where: { id: postId },
    data: { remarks },
  });
  return NextResponse.json(post);
}
