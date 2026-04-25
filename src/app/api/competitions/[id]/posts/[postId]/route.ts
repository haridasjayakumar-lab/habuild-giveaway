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
  const body = await req.json();
  const data: Record<string, string> = {};
  if (body.remarks !== undefined) data.remarks = body.remarks;
  if (body.authorName !== undefined) data.authorName = body.authorName;
  const post = await prisma.post.update({ where: { id: postId }, data });
  return NextResponse.json(post);
}
