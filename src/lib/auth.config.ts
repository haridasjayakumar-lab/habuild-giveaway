import type { NextAuthConfig } from "next-auth";

// Edge-compatible config (no Prisma, no Node.js APIs)
// Used by middleware for route protection
export const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [], // providers are added in auth.ts (server-only)
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || "judge";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const publicPaths = ["/login", "/register", "/api/auth"];
      const isPublic = publicPaths.some((p) => nextUrl.pathname.startsWith(p));

      if (isPublic) return true;
      if (isLoggedIn) return true;

      return false; // redirect to login
    },
  },
};
