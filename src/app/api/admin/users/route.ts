import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function getAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") return null;
  return session.user;
}

export async function GET() {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(users);
}

export async function PATCH(request: NextRequest) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId, role } = await request.json();

  if (!userId || !["admin", "judge"].includes(role)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json(updated);
}
