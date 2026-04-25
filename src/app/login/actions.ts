"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginAction(formData: FormData) {
  const password = formData.get("password") as string;

  if (!password) {
    return { error: "Password is required." };
  }

  try {
    await signIn("credentials", {
      password,
      redirectTo: "/",
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { error: "Incorrect password. Please try again." };
      }
      return { error: "Something went wrong. Please try again." };
    }
    // NextAuth throws a NEXT_REDIRECT on successful redirect — rethrow it
    throw error;
  }
}
