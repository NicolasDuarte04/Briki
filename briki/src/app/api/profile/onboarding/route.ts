import { NextResponse } from "next/server";
import { PrismaClient, type Prisma } from "@prisma/client";
import { auth } from "@/../auth";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // Get the session
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the request body
    const body = await request.json();
    const { name, locale, onboardingCompleted } = body as {
      name?: string | null;
      locale?: string | null;
      onboardingCompleted?: boolean;
    };

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Create or update the profile
    const updateData: Prisma.ProfileUpdateInput = {};
    const createData: Prisma.ProfileCreateInput = {
      user: { connect: { id: user.id } },
    };

    if (name !== undefined) {
      updateData.name = name ?? null;
      createData.name = name ?? null;
    }
    if (typeof locale === "string") {
      updateData.locale = locale;
      createData.locale = locale;
    }
    if (typeof onboardingCompleted === "boolean") {
      updateData.onboardingCompleted = onboardingCompleted;
      createData.onboardingCompleted = onboardingCompleted;
    }

    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: updateData,
      create: createData,
    });

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
