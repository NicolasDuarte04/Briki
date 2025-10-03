import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

const googleClientId =
  process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
const googleClientSecret =
  process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "";

if (!googleClientId || !googleClientSecret) {
  throw new Error("Missing Google OAuth credentials for NextAuth configuration.");
}

const authSecret = process.env.AUTH_SECRET;

if (!authSecret) {
  // In production, you should definitely have a secret
  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing AUTH_SECRET environment variable for NextAuth configuration.");
  }
  // In development, we can generate a secret if one is not provided
  console.warn("Missing AUTH_SECRET environment variable. A temporary secret will be used. Please set a secret for production environments.");
}

// Edge-compatible configuration for middleware
export const authConfig: NextAuthConfig = {
  ...(authSecret && { secret: authSecret }),
  trustHost: true,
  session: {
    strategy: "jwt" as const, // JWT strategy is required for Edge Runtime
  },
  providers: [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
  callbacks: {
    async jwt({ token }) {
      // In middleware, we can't access the database
      // So we'll just pass through any existing token data
      return token;
    },
    async session({ session, token }) {
      if (!session.user) {
        return session;
      }

      const sessionUser = session.user as typeof session.user & {
        id?: string;
        profileId?: string;
        onboardingCompleted?: boolean;
      };

      if (token.sub) {
        sessionUser.id = token.sub;
      }
      
      // Pass through any profile data that was set by the main auth config
      if (token.profileId !== undefined) {
        sessionUser.profileId = token.profileId as string;
      }
      
      if (token.onboardingCompleted !== undefined) {
        sessionUser.onboardingCompleted = token.onboardingCompleted as boolean;
      }

      return session;
    },
  },
};

export const { auth } = NextAuth(authConfig);
