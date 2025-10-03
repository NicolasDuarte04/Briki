import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// Use a global object to cache the Prisma Client and the connection pool
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

// Determine if we are in an edge environment
const isEdge = process.env.NEXT_RUNTIME === "edge";

// Create a connection pool if it doesn't exist
if (!globalForPrisma.pool) {
  // Use the direct URL to bypass the connection pooler, which might have a stale schema cache
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  
  globalForPrisma.pool = new Pool({
    connectionString: connectionString,
    // Edge environments might require SSL
    ssl: isEdge ? { rejectUnauthorized: false } : undefined,
  });
}
const pool = globalForPrisma.pool;
const adapter = new PrismaPg(pool);

// Instantiate Prisma Client, using the adapter for edge environments
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
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
  events: {
    async signIn({ user }) {
      // Ensure a Profile exists for newly created users
      if (!user?.id) return;
      try {
        await prisma.profile.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            name: user.name ?? undefined,
            // locale defaults to "en" via schema default
            onboardingCompleted: false,
          },
        });
      } catch (error) {
        console.warn("Profile upsert during signIn failed:", error);
      }
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Allow the sign in to proceed
      return true;
    },
    async redirect({ url, baseUrl }) {
      // After sign-in, always redirect to home
      // The home page will check onboarding status and redirect if needed
      if (url.startsWith(baseUrl)) {
        return url;
      }
      return baseUrl;
    },
    async jwt({ token, user }) {
      // Ensure the token has the user id on initial sign-in
      if (user) {
        token.id = user.id;
      }

      // Fetch fresh profile data to keep onboarding flag current
      if (token.id) {
        try {
          const profile = await prisma.profile.findUnique({
            where: { userId: token.id as string },
            select: { id: true, onboardingCompleted: true },
          });
          if (profile) {
            token.profileId = profile.id;
            token.onboardingCompleted = profile.onboardingCompleted;
          }
        } catch (error) {
          // Non-fatal; leave token as-is
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
