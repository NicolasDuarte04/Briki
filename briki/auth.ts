import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}

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

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...(authSecret && { secret: authSecret }),
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt" as const, // Use JWT strategy for middleware compatibility
  },
  providers: [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
      }

      // Fetch profile data on every token refresh
      if (token.id) {
        const profile = await prisma.profile.findUnique({
          where: { userId: token.id as string },
          select: { id: true, onboardingCompleted: true },
        });

        if (profile) {
          token.profileId = profile.id;
          token.onboardingCompleted = profile.onboardingCompleted;
        }
      }

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

      if (token.id) {
        sessionUser.id = token.id as string;
      }
      
      if (token.profileId !== undefined) {
        sessionUser.profileId = token.profileId as string;
      }
      
      if (token.onboardingCompleted !== undefined) {
        sessionUser.onboardingCompleted = token.onboardingCompleted as boolean;
      }

      return session;
    },
  },
});
