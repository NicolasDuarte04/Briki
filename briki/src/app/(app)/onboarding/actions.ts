"use server";

import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type SupportedLocale = "en" | "es";

// Server Action: validates payload, upserts Profile, marks onboardingCompleted, redirects to "/"
export async function completeOnboardingAction(formData: FormData) {
  const Schema = z.object({
    name: z.string().min(1, "Name is required"),
    role: z.string().optional(),
    company: z.string().optional(),
    locale: z.union([z.literal("en"), z.literal("es")]).default("en"),
  });

  const raw = {
    name: (formData.get("name") ?? "").toString(),
    role: formData.get("role")?.toString(),
    company: formData.get("company")?.toString(),
    locale: (formData.get("locale") ?? "en").toString() as SupportedLocale,
  };

  const payload = Schema.parse(raw);

  // Session
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  // Prisma (global cached)
  const globalForPrisma = globalThis as unknown as { prisma?: InstanceType<typeof PrismaClient> };
  const prisma = globalForPrisma.prisma ?? new PrismaClient();
  if (!globalForPrisma.prisma) globalForPrisma.prisma = prisma;

  const userId = (session!.user as { id?: string }).id;

  // Fallback: if no id on session, try by email
  let resolvedUserId: string | null = userId ?? null;
  if (!resolvedUserId && session!.user?.email) {
    const user = await prisma.user.findUnique({ where: { email: session!.user.email } });
    resolvedUserId = user?.id ?? null;
  }

  if (!resolvedUserId) {
    redirect("/");
  }

  await prisma.profile.upsert({
    where: { userId: resolvedUserId! },
    update: {
      name: payload.name,
      locale: payload.locale,
      onboardingCompleted: true,
    },
    create: {
      userId: resolvedUserId!,
      name: payload.name,
      locale: payload.locale,
      onboardingCompleted: true,
    },
  });

  // Revalidate the home page to force a fresh data fetch
  revalidatePath("/");
  
  redirect("/");
}
