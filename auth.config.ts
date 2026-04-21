import type { NextAuthConfig } from "next-auth";

/**
 * Configuração Auth.js edge-safe (sem Node APIs).
 * Usada pelo middleware que corre no Edge runtime.
 * A config completa (com Credentials + bcrypt) está em `auth.ts`.
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ request, auth }) {
      const loggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isOnLogin = pathname.startsWith("/login");

      if (isOnLogin) {
        if (loggedIn) {
          return Response.redirect(new URL("/", request.nextUrl));
        }
        return true;
      }

      return loggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};
