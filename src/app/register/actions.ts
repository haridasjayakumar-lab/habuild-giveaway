"use server";

import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function registerAction(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return { error: "Name, email, and password are required." };
  }

  if (!email.toLowerCase().endsWith("@habuild.in")) {
    return { error: "Only @habuild.in email addresses are allowed." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  // Create the user — first user or configured admin emails get admin role
  const passwordHash = await hash(password, 12);
  const userCount = await prisma.user.count();
  const adminEmails = (process.env.ADMIN_EMAILS || "").toLowerCase().split(",").map((e) => e.trim()).filter(Boolean);
  const isAdmin = userCount === 0 || adminEmails.includes(email.toLowerCase());

  await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: isAdmin ? "admin" : "judge",
    },
  });

  // Auto-sign in after registration
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      // Registration succeeded but auto-login failed
      return { error: "Account created! Please sign in.", redirect: "/login" };
    }
    // NEXT_REDIRECT on success — rethrow
    throw error;
  }
}
