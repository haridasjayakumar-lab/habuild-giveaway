import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Password",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const password = credentials?.password as string;
        if (!password) return null;

        const adminPassword = process.env.ADMIN_PASSWORD;
        const judgePassword = process.env.JUDGE_PASSWORD;

        if (adminPassword && password === adminPassword) {
          return { id: "admin", name: "Admin", role: "admin" };
        }
        if (judgePassword && password === judgePassword) {
          return { id: "judge", name: "Judge", role: "judge" };
        }

        return null;
      },
    }),
  ],
});
