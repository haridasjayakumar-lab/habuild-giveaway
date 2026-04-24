"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (!email.toLowerCase().endsWith("@habuild.in")) {
    return { error: "Only @habuild.in email addresses are allowed." };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { error: "Invalid email or password. Make sure you've registered first." };
      }
      return { error: "Something went wrong. Please try again." };
    }
    // NextAuth throws a NEXT_REDIRECT error on successful redirect — rethrow it
    throw error;
  }
}
